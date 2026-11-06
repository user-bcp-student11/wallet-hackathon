#!/usr/bin/env node
/**
 * Mock local del Wallet (parte W1 · Registro y activación) con una base de datos en archivo JSON.
 *
 * Implementa, según bcp-wallet-mock-openapi.yaml:
 *   POST /persons/lookup                 consulta una persona de prueba por tipo y número (demo)
 *   POST /otp/challenges                 genera un OTP simulado: el código SOLO se imprime en esta consola
 *   POST /otp/challenges/{id}/verify     verifica el código ingresado
 *   POST /kyc/verifications              crea verificación + wallet (saldo cero); acepta
 *                                        { userId, documentType: DNI|CE, document, otpChallengeId } o, por
 *                                        compatibilidad, { documentType: TEST, document: TEST-… }
 *   GET  /kyc/verifications/{id}         consulta la verificación
 *   POST /kyc/verifications/{id}/decision resuelve la revisión humana
 *   GET  /wallets/{id}                   estado y saldos
 *   GET  /support/cases                  casos de soporte
 * y la latencia simulada (cabecera X-Mock-Latency-Ms o ?latency=).
 *
 * Es una herramienta de desarrollo: NO verifica documentos reales ni es el servicio oficial.
 * Usa SOLO datos ficticios. /persons/lookup es solo para la demostración: una consulta abierta por
 * documento permite enumerar usuarios; en producción exige autenticación, autorización y límites.
 * Sin dependencias: solo módulos integrados de Node.
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DB_FILE = join(here, 'db.json');
export const SEED_FILE = join(here, 'db.seed.json');

const MAX_BODY_BYTES = 65536;
const MAX_LATENCY_MS = 5000;
const KYC_SCENARIOS = ['APPROVED', 'REJECTED', 'MANUAL_REVIEW', 'UNAVAILABLE'];
const DECISIONS = ['ACTIVE', 'REJECTED'];
const IDENTITY_DOCUMENT_TYPES = ['DNI', 'CE'];
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_OTP_TTL_SECONDS = 300;
const DEFAULT_OTP_MAX_ATTEMPTS = 3;

/** Base de datos en archivo: se lee en cada solicitud, así que editar db.json surte efecto al instante. */
export function createStore(dbFile = DEFAULT_DB_FILE, seedFile = SEED_FILE) {
  const reset = () => copyFileSync(seedFile, dbFile);
  if (!existsSync(dbFile)) {
    reset();
  }
  return {
    dbFile,
    reset,
    read() {
      const db = JSON.parse(readFileSync(dbFile, 'utf8'));
      // Un db.json creado con una versión anterior del seed no tiene personas: se completan.
      if (!Array.isArray(db.persons)) {
        db.persons = JSON.parse(readFileSync(seedFile, 'utf8')).persons ?? [];
      }
      if (!Array.isArray(db.otpChallenges)) {
        db.otpChallenges = [];
      }
      return db;
    },
    write(db) {
      const tmp = `${dbFile}.tmp`;
      writeFileSync(tmp, `${JSON.stringify(db, null, 2)}\n`);
      renameSync(tmp, dbFile);
    },
  };
}

const newId = (prefix) => `${prefix}-${randomBytes(4).toString('hex')}`;

const toKyc = (verification) => ({
  id: verification.id,
  wallet_id: verification.wallet_id,
  scenario: verification.scenario,
  status: verification.status,
});

const toWallet = (wallet) => ({
  id: wallet.id,
  status: wallet.status,
  balance: wallet.balance,
  reserved: wallet.reserved,
  available: wallet.balance - wallet.reserved,
  currency: wallet.currency,
});

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Valida el cuerpo de POST /kyc/verifications. Devuelve `undefined` si es inválido.
 *  - Persona: { userId (GUID), documentType: DNI | CE, document, scenario? }.
 *    No se valida longitud ni formato del número: pendiente de acordar con producto.
 *  - Heredada: { documentType: TEST, document: TEST-…, scenario? } (clientes existentes).
 */
function parseKycRequest(body) {
  if (!isPlainObject(body)) {
    return undefined;
  }
  const scenario = body.scenario === undefined ? 'APPROVED' : body.scenario;
  if (!KYC_SCENARIOS.includes(scenario)) {
    return undefined;
  }
  const { documentType, document } = body;

  if (documentType === 'TEST') {
    if (typeof document !== 'string' || document.length < 1 || document.length > 200) {
      return undefined;
    }
    return /^TEST-/.test(document) ? { kind: 'test', document, scenario } : undefined;
  }

  if (IDENTITY_DOCUMENT_TYPES.includes(documentType)) {
    if (typeof body.userId !== 'string' || !GUID.test(body.userId)) {
      return undefined;
    }
    if (typeof document !== 'string' || document.length < 1) {
      return undefined;
    }
    if (body.otpChallengeId !== undefined && typeof body.otpChallengeId !== 'string') {
      return undefined;
    }
    return {
      kind: 'person',
      userId: body.userId.toLowerCase(),
      documentType,
      document,
      scenario,
      otpChallengeId: body.otpChallengeId,
    };
  }
  return undefined;
}

/** Consulta de persona (solo demo): devuelve únicamente el userId. */
function lookupPerson(body, db) {
  if (
    !isPlainObject(body) ||
    !IDENTITY_DOCUMENT_TYPES.includes(body.documentType) ||
    typeof body.documentNumber !== 'string' ||
    body.documentNumber.length < 1
  ) {
    return { status: 400, body: { error: 'INVALID_REQUEST' } };
  }
  // Comparación exacta, sin normalizar: pendiente de acordar con producto.
  const person = db.persons.find(
    (item) =>
      item.document.type === body.documentType && item.document.number === body.documentNumber,
  );
  return person
    ? { status: 200, body: { userId: person.userId } }
    : { status: 404, body: { error: 'PERSON_NOT_FOUND' } };
}

const positiveInt = (value, fallback) => (Number.isInteger(value) && value > 0 ? value : fallback);

/** El código nunca se guarda en claro en db.json: solo su huella. */
const hashCode = (challengeId, code) =>
  createHash('sha256').update(`${challengeId}:${code}`).digest('hex');

const isExpired = (challenge, now) => now > Date.parse(challenge.expiresAt);

/**
 * Genera un OTP SIMULADO. El código se imprime ÚNICAMENTE en la consola de este servidor (por
 * `ctx.log`) y nunca viaja en la respuesta HTTP. En producción se enviaría por un canal real.
 */
function createOtpChallenge(body, db, ctx) {
  if (!isPlainObject(body) || typeof body.userId !== 'string' || !GUID.test(body.userId)) {
    return { status: 400, body: { error: 'INVALID_REQUEST' } };
  }
  const userId = body.userId.toLowerCase();
  if (!db.persons.some((item) => item.userId.toLowerCase() === userId)) {
    return { status: 404, body: { error: 'PERSON_NOT_FOUND' } };
  }

  const ttl = positiveInt(db.settings?.otpTtlSeconds, DEFAULT_OTP_TTL_SECONDS);
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  const id = newId('otp');
  const now = ctx.now();

  // Un código nuevo reemplaza a los anteriores de la misma persona.
  db.otpChallenges = db.otpChallenges.filter((item) => item.userId !== userId);
  db.otpChallenges.push({
    id,
    userId,
    codeHash: hashCode(id, code),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttl * 1000).toISOString(),
    attempts: 0,
    status: 'PENDING',
  });

  ctx.log(
    `[OTP simulado] Código para el usuario ${userId}: ${code} (vence en ${ttl} s). Solo demostración.`,
  );
  return { status: 201, body: { challengeId: id, expiresInSeconds: ttl }, save: true };
}

function verifyOtp(id, body, db, ctx) {
  const challenge = db.otpChallenges.find((item) => item.id === id);
  if (!challenge) {
    return { status: 404, body: { error: 'OTP_CHALLENGE_NOT_FOUND' } };
  }
  if (!isPlainObject(body) || typeof body.code !== 'string' || body.code.length < 1) {
    return { status: 400, body: { error: 'INVALID_REQUEST' } };
  }
  if (challenge.status === 'LOCKED') {
    return { status: 429, body: { error: 'OTP_ATTEMPTS_EXCEEDED' } };
  }
  if (challenge.status === 'USED') {
    return { status: 409, body: { error: 'OTP_ALREADY_USED' } };
  }
  if (isExpired(challenge, ctx.now())) {
    return { status: 410, body: { error: 'OTP_EXPIRED' } };
  }

  if (challenge.codeHash === hashCode(challenge.id, body.code)) {
    challenge.status = 'VERIFIED';
    return { status: 200, body: { challengeId: challenge.id, status: 'VERIFIED' }, save: true };
  }

  const maxAttempts = positiveInt(db.settings?.otpMaxAttempts, DEFAULT_OTP_MAX_ATTEMPTS);
  challenge.attempts += 1;
  if (challenge.attempts >= maxAttempts) {
    challenge.status = 'LOCKED';
    return { status: 429, body: { error: 'OTP_ATTEMPTS_EXCEEDED' }, save: true };
  }
  return {
    status: 422,
    body: { error: 'OTP_INVALID', attemptsRemaining: maxAttempts - challenge.attempts },
    save: true,
  };
}

/** La activación con persona exige un OTP verificado de esa persona, vigente y sin usar. */
function findVerifiedOtp(challengeId, userId, db, now) {
  const challenge =
    typeof challengeId === 'string'
      ? db.otpChallenges.find((item) => item.id === challengeId && item.userId === userId)
      : undefined;
  if (!challenge || challenge.status !== 'VERIFIED') {
    return { error: { status: 403, body: { error: 'OTP_REQUIRED' } } };
  }
  if (isExpired(challenge, now)) {
    return { error: { status: 410, body: { error: 'OTP_EXPIRED' } } };
  }
  return { challenge };
}

function createVerification(body, db, ctx) {
  const input = parseKycRequest(body);
  if (!input) {
    return { status: 400, body: { error: 'INVALID_REQUEST' } };
  }

  let person;
  let otp;
  if (input.kind === 'person') {
    person = db.persons.find((item) => item.userId.toLowerCase() === input.userId);
    if (!person) {
      return { status: 404, body: { error: 'PERSON_NOT_FOUND' } };
    }
    if (person.document.type !== input.documentType || person.document.number !== input.document) {
      return { status: 422, body: { error: 'DOCUMENT_MISMATCH' } };
    }
    // Sin un OTP verificado de esta persona no se activa nada (403 OTP_REQUIRED / 410 OTP_EXPIRED).
    const found = findVerifiedOtp(input.otpChallengeId, person.userId, db, ctx.now());
    if (found.error) {
      return found.error;
    }
    otp = found.challenge;
    // Repetir la activación no crea otra wallet: se devuelve la verificación existente (200).
    const existing = db.verifications.find((item) => item.userId === person.userId);
    if (existing) {
      otp.status = 'USED';
      return { status: 200, body: toKyc(existing), save: true };
    }
  }

  // Opción de desarrollo: forzar el escenario desde db.json (settings.scenarioOverride).
  const override = db.settings?.scenarioOverride;
  const scenario = KYC_SCENARIOS.includes(override) ? override : input.scenario;

  if (scenario === 'UNAVAILABLE') {
    return { status: 503, body: { error: 'KYC_UNAVAILABLE' } };
  }

  const status =
    scenario === 'APPROVED' ? 'ACTIVE' : scenario === 'REJECTED' ? 'REJECTED' : 'PENDING';
  const wallet = {
    id: newId('wallet'),
    status,
    balance: 0,
    reserved: 0,
    currency: 'PEN',
  };
  const verification = {
    id: newId('kyc'),
    wallet_id: wallet.id,
    scenario,
    status,
    document: input.document,
    ...(person ? { userId: person.userId } : {}),
  };
  if (otp) {
    otp.status = 'USED';
  }
  db.wallets.push(wallet);
  db.verifications.push(verification);
  if (scenario === 'MANUAL_REVIEW') {
    db.supportCases.push({
      id: newId('case'),
      resource: verification.id,
      reason: 'KYC_REVIEW',
      status: 'OPEN',
    });
  }
  return { status: 201, body: toKyc(verification), save: true };
}

function getVerification(id, db) {
  const verification = db.verifications.find((item) => item.id === id);
  return verification
    ? { status: 200, body: toKyc(verification) }
    : { status: 404, body: { error: 'NOT_FOUND' } };
}

function decide(id, body, db) {
  const verification = db.verifications.find((item) => item.id === id);
  if (!verification) {
    return { status: 404, body: { error: 'NOT_FOUND' } };
  }
  const decision = isPlainObject(body) ? body.decision : undefined;
  if (!DECISIONS.includes(decision)) {
    return { status: 400, body: { error: 'INVALID_DECISION' } };
  }
  // Repetir la misma decisión conserva el resultado.
  if (verification.status === decision) {
    return { status: 200, body: toKyc(verification) };
  }
  // Una decisión final no se puede cambiar.
  if (verification.status !== 'PENDING') {
    return { status: 409, body: { error: 'DECISION_CONFLICT' } };
  }
  verification.status = decision;
  const wallet = db.wallets.find((item) => item.id === verification.wallet_id);
  if (wallet) {
    wallet.status = decision;
  }
  for (const supportCase of db.supportCases) {
    if (supportCase.resource === verification.id && supportCase.reason === 'KYC_REVIEW') {
      supportCase.status = 'RESOLVED';
    }
  }
  return { status: 200, body: toKyc(verification), save: true };
}

function getWallet(id, db) {
  const wallet = db.wallets.find((item) => item.id === id);
  return wallet
    ? { status: 200, body: toWallet(wallet) }
    : { status: 404, body: { error: 'NOT_FOUND' } };
}

function route(method, path, body, db, ctx) {
  let match;
  if (method === 'POST' && path === '/otp/challenges') {
    return createOtpChallenge(body, db, ctx);
  }
  if (method === 'POST' && (match = path.match(/^\/otp\/challenges\/([^/]+)\/verify$/))) {
    return verifyOtp(decodeURIComponent(match[1]), body, db, ctx);
  }
  if (method === 'POST' && path === '/persons/lookup') {
    return lookupPerson(body, db);
  }
  if (method === 'POST' && path === '/kyc/verifications') {
    return createVerification(body, db, ctx);
  }
  if (method === 'GET' && (match = path.match(/^\/kyc\/verifications\/([^/]+)$/))) {
    return getVerification(decodeURIComponent(match[1]), db);
  }
  if (method === 'POST' && (match = path.match(/^\/kyc\/verifications\/([^/]+)\/decision$/))) {
    return decide(decodeURIComponent(match[1]), body, db);
  }
  if (method === 'GET' && (match = path.match(/^\/wallets\/([^/]+)$/))) {
    return getWallet(decodeURIComponent(match[1]), db);
  }
  if (method === 'GET' && path === '/support/cases') {
    return { status: 200, body: db.supportCases };
  }
  return { status: 404, body: { error: 'NOT_FOUND' } };
}

/** Latencia simulada: la cabecera tiene prioridad sobre ?latency=, y ambas deben ser válidas. */
function parseLatency(headerValue, queryValue) {
  const parse = (raw) => {
    if (raw === undefined || raw === null) {
      return undefined;
    }
    if (!/^\d+$/.test(String(raw)) || Number(raw) > MAX_LATENCY_MS) {
      return NaN;
    }
    return Number(raw);
  };
  const fromHeader = parse(headerValue);
  const fromQuery = parse(queryValue);
  if (Number.isNaN(fromHeader) || Number.isNaN(fromQuery)) {
    return { invalid: true };
  }
  return { ms: fromHeader ?? fromQuery ?? 0 };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-mock-latency-ms',
  'access-control-expose-headers': 'X-Mock-Latency-Ms',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
      } else if (!tooLarge) {
        chunks.push(chunk);
      }
    });
    req.on('end', () => resolve({ tooLarge, text: Buffer.concat(chunks).toString('utf8') }));
    req.on('error', reject);
  });
}

/** Crea el servidor HTTP (sin ponerlo a escuchar). */
export function createMockServer({
  store = createStore(),
  log = console.log,
  now = Date.now,
} = {}) {
  const ctx = { log, now };
  return http.createServer(async (req, res) => {
    const send = (status, body, latencyMs) => {
      res.writeHead(status, {
        ...CORS_HEADERS,
        'content-type': 'application/json; charset=utf-8',
        'x-mock-latency-ms': String(latencyMs),
      });
      res.end(JSON.stringify(body));
      log(`${req.method} ${req.url} -> ${status}${latencyMs ? ` (+${latencyMs} ms)` : ''}`);
    };

    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS).end();
        return;
      }

      const url = new URL(req.url ?? '/', 'http://localhost');
      const latency = parseLatency(
        req.headers['x-mock-latency-ms'],
        url.searchParams.get('latency'),
      );
      const { tooLarge, text } = await readBody(req);

      if (latency.invalid) {
        send(400, { error: 'INVALID_MOCK_LATENCY' }, 0);
        return;
      }
      await sleep(latency.ms);

      if (tooLarge) {
        send(413, { error: 'PAYLOAD_TOO_LARGE' }, latency.ms);
        return;
      }

      let body;
      if (req.method === 'POST' && text.trim() !== '') {
        try {
          body = JSON.parse(text);
        } catch {
          send(400, { error: 'INVALID_JSON' }, latency.ms);
          return;
        }
      }

      const db = store.read();
      const result = route(req.method ?? 'GET', url.pathname, body, db, ctx);
      if (result.save) {
        store.write(db);
      }
      send(result.status, result.body, latency.ms);
    } catch (error) {
      log(`Error interno: ${error instanceof Error ? error.message : error}`);
      send(500, { error: 'MOCK_DB_ERROR' }, 0);
    }
  });
}

function main() {
  const args = process.argv.slice(2);
  const option = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];
  const dbFile = option('db') ?? process.env['DB_FILE'] ?? DEFAULT_DB_FILE;
  const store = createStore(dbFile);

  if (args.includes('--reset')) {
    store.reset();
    console.log(`Base de datos restaurada desde db.seed.json → ${dbFile}`);
    return;
  }

  const port = Number(option('port') ?? process.env['PORT'] ?? 8787);
  const host = option('host') ?? process.env['HOST'] ?? '127.0.0.1';
  createMockServer({ store }).listen(port, host, () => {
    console.log(`Mock del Wallet (W1) escuchando en http://${host}:${port}`);
    console.log(`Base de datos: ${dbFile}`);
    console.log(
      'Ctrl+C para detenerlo. Es una herramienta de desarrollo: la verificación es simulada.',
    );
    console.log('Usa SOLO datos ficticios. Personas de prueba: ver "persons" en db.json.');
    console.log(
      'Los códigos OTP simulados aparecerán aquí, en esta consola (no en las respuestas).',
    );
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
