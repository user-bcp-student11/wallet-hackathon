import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import { SEED_FILE, createMockServer, createStore } from './server.mjs';

describe('OTP simulado: el código solo aparece en la consola del servidor', () => {
  let dir;
  let dbFile;
  let store;
  let server;
  let base;
  let clock;
  const logs = [];

  before(async () => {
    dir = mkdtempSync(join(tmpdir(), 'mock-otp-'));
    dbFile = join(dir, 'db.json');
    store = createStore(dbFile);
    // Reloj inyectable: permite probar la expiración sin esperar.
    server = createMockServer({ store, log: (line) => logs.push(line), now: () => clock });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    store.reset();
    clock = Date.now();
    logs.length = 0;
  });

  const call = async (method, path, body) => {
    const response = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, json: text ? JSON.parse(text) : undefined, text };
  };
  const readDb = () => JSON.parse(readFileSync(dbFile, 'utf8'));
  const setSettings = (settings) => {
    const db = readDb();
    db.settings = { ...db.settings, ...settings };
    writeFileSync(dbFile, JSON.stringify(db));
  };

  // Personas ficticias del seed (no se fijan sus datos en las pruebas).
  const persons = JSON.parse(readFileSync(SEED_FILE, 'utf8')).persons;
  const toUser = (person) => ({
    userId: person.userId,
    documentType: person.document.type,
    document: person.document.number,
  });
  const DNI_USER = toUser(persons.find((person) => person.document.type === 'DNI'));
  const CE_USER = toUser(persons.find((person) => person.document.type === 'CE'));

  const otpLines = () => logs.filter((line) => line.includes('[OTP simulado]'));
  const consoleCode = () =>
    otpLines()
      .at(-1)
      ?.match(/: (\d{6}) \(/)?.[1];
  const requestOtp = (userId) => call('POST', '/otp/challenges', { userId });
  const verifyOtp = (challengeId, code) =>
    call('POST', `/otp/challenges/${challengeId}/verify`, { code });
  const wrongCode = (code) => (code === '000000' ? '111111' : '000000');
  /** Pide un OTP y lo verifica con el código impreso en la consola. */
  const verifiedChallenge = async (userId) => {
    const created = await requestOtp(userId);
    await verifyOtp(created.json.challengeId, consoleCode());
    return created.json.challengeId;
  };
  const activate = (user, otpChallengeId, extra = {}) =>
    call('POST', '/kyc/verifications', {
      ...user,
      ...(otpChallengeId === undefined ? {} : { otpChallengeId }),
      scenario: 'APPROVED',
      ...extra,
    });

  describe('POST /otp/challenges', () => {
    it('crea un reto y devuelve solo challengeId y expiresInSeconds', async () => {
      const result = await requestOtp(DNI_USER.userId);

      assert.equal(result.status, 201);
      assert.deepEqual(Object.keys(result.json).sort(), ['challengeId', 'expiresInSeconds']);
      assert.match(result.json.challengeId, /^otp-/);
      assert.equal(result.json.expiresInSeconds, 300);
    });

    it('imprime el código de 6 dígitos en la consola del servidor', async () => {
      await requestOtp(DNI_USER.userId);

      assert.equal(otpLines().length, 1);
      assert.match(
        otpLines()[0],
        /\[OTP simulado\] Código para el usuario .+: \d{6} \(vence en 300 s\)/,
      );
      assert.ok(otpLines()[0].includes(DNI_USER.userId));
    });

    it('el código NO viaja en la respuesta HTTP ni se guarda en claro en db.json', async () => {
      const result = await requestOtp(DNI_USER.userId);
      const code = consoleCode();

      assert.ok(!result.text.includes(code));
      assert.ok(!readFileSync(dbFile, 'utf8').includes(code));
    });

    it('el código tampoco aparece en el registro de accesos, solo en la línea del OTP', async () => {
      await requestOtp(DNI_USER.userId);
      const code = consoleCode();

      const others = logs.filter((line) => !line.includes('[OTP simulado]'));
      assert.ok(others.every((line) => !line.includes(code)));
    });

    it('genera códigos aleatorios de 6 dígitos', async () => {
      const codes = new Set();
      for (let i = 0; i < 8; i += 1) {
        await requestOtp(DNI_USER.userId);
        codes.add(consoleCode());
      }

      assert.ok([...codes].every((code) => /^\d{6}$/.test(code)));
      assert.ok(codes.size > 1, 'los códigos no deben repetirse siempre');
    });

    it('respeta settings.otpTtlSeconds', async () => {
      setSettings({ otpTtlSeconds: 60 });
      const result = await requestOtp(DNI_USER.userId);

      assert.equal(result.json.expiresInSeconds, 60);
      assert.match(otpLines()[0], /vence en 60 s/);
    });

    it('una persona inexistente responde 404 PERSON_NOT_FOUND y no imprime ningún código', async () => {
      const result = await requestOtp('11111111-2222-4333-8444-555555555555');

      assert.equal(result.status, 404);
      assert.deepEqual(result.json, { error: 'PERSON_NOT_FOUND' });
      assert.equal(otpLines().length, 0);
    });

    for (const [name, body] of [
      ['sin userId', {}],
      ['userId que no es GUID', { userId: 'abc' }],
      ['userId que no es texto', { userId: 1 }],
    ]) {
      it(`rechaza con 400: ${name}`, async () => {
        const result = await call('POST', '/otp/challenges', body);

        assert.equal(result.status, 400);
        assert.equal(result.json.error, 'INVALID_REQUEST');
      });
    }

    it('rechaza con 400 un cuerpo ausente', async () => {
      assert.equal((await call('POST', '/otp/challenges')).status, 400);
    });

    it('un código nuevo reemplaza al anterior de la misma persona', async () => {
      const first = await requestOtp(DNI_USER.userId);
      const firstCode = consoleCode();
      const second = await requestOtp(DNI_USER.userId);

      assert.equal((await verifyOtp(first.json.challengeId, firstCode)).status, 404);
      assert.equal((await verifyOtp(second.json.challengeId, consoleCode())).status, 200);
    });
  });

  describe('POST /otp/challenges/{id}/verify', () => {
    it('el código correcto verifica el reto (200 VERIFIED)', async () => {
      const created = await requestOtp(DNI_USER.userId);
      const result = await verifyOtp(created.json.challengeId, consoleCode());

      assert.equal(result.status, 200);
      assert.deepEqual(result.json, { challengeId: created.json.challengeId, status: 'VERIFIED' });
    });

    it('un código incorrecto responde 422 OTP_INVALID e indica los intentos restantes', async () => {
      const created = await requestOtp(DNI_USER.userId);
      const bad = wrongCode(consoleCode());

      const first = await verifyOtp(created.json.challengeId, bad);
      const second = await verifyOtp(created.json.challengeId, bad);

      assert.equal(first.status, 422);
      assert.deepEqual(first.json, { error: 'OTP_INVALID', attemptsRemaining: 2 });
      assert.deepEqual(second.json, { error: 'OTP_INVALID', attemptsRemaining: 1 });
    });

    it('tras agotar los intentos bloquea el reto (429), incluso con el código correcto', async () => {
      const created = await requestOtp(DNI_USER.userId);
      const code = consoleCode();

      await verifyOtp(created.json.challengeId, wrongCode(code));
      await verifyOtp(created.json.challengeId, wrongCode(code));
      const third = await verifyOtp(created.json.challengeId, wrongCode(code));
      const withRightCode = await verifyOtp(created.json.challengeId, code);

      assert.equal(third.status, 429);
      assert.deepEqual(third.json, { error: 'OTP_ATTEMPTS_EXCEEDED' });
      assert.equal(withRightCode.status, 429);
    });

    it('un bloqueo se resuelve pidiendo un código nuevo', async () => {
      const created = await requestOtp(DNI_USER.userId);
      for (let i = 0; i < 3; i += 1) {
        await verifyOtp(created.json.challengeId, wrongCode(consoleCode()));
      }

      const fresh = await requestOtp(DNI_USER.userId);
      assert.equal((await verifyOtp(fresh.json.challengeId, consoleCode())).status, 200);
    });

    it('respeta settings.otpMaxAttempts', async () => {
      setSettings({ otpMaxAttempts: 1 });
      const created = await requestOtp(DNI_USER.userId);

      const result = await verifyOtp(created.json.challengeId, wrongCode(consoleCode()));

      assert.equal(result.status, 429);
    });

    it('un reto vencido responde 410 OTP_EXPIRED', async () => {
      const created = await requestOtp(DNI_USER.userId);
      const code = consoleCode();
      clock += 301 * 1000;

      const result = await verifyOtp(created.json.challengeId, code);

      assert.equal(result.status, 410);
      assert.deepEqual(result.json, { error: 'OTP_EXPIRED' });
    });

    it('un reto inexistente responde 404 OTP_CHALLENGE_NOT_FOUND', async () => {
      const result = await verifyOtp('otp-no-existe', '123456');

      assert.equal(result.status, 404);
      assert.deepEqual(result.json, { error: 'OTP_CHALLENGE_NOT_FOUND' });
    });

    for (const [name, body] of [
      ['sin code', {}],
      ['code que no es texto', { code: 123456 }],
      ['code vacío', { code: '' }],
    ]) {
      it(`rechaza con 400: ${name}`, async () => {
        const created = await requestOtp(DNI_USER.userId);
        const result = await call(
          'POST',
          `/otp/challenges/${created.json.challengeId}/verify`,
          body,
        );

        assert.equal(result.status, 400);
        assert.equal(result.json.error, 'INVALID_REQUEST');
      });
    }
  });

  describe('la activación con persona exige un OTP verificado', () => {
    const walletCount = () => readDb().wallets.length;

    it('sin otpChallengeId responde 403 OTP_REQUIRED y no crea nada', async () => {
      const before = walletCount();
      const result = await activate(DNI_USER);

      assert.equal(result.status, 403);
      assert.deepEqual(result.json, { error: 'OTP_REQUIRED' });
      assert.equal(walletCount(), before);
    });

    it('con un reto sin verificar responde 403 OTP_REQUIRED', async () => {
      const created = await requestOtp(DNI_USER.userId);

      const result = await activate(DNI_USER, created.json.challengeId);

      assert.equal(result.status, 403);
      assert.equal(result.json.error, 'OTP_REQUIRED');
    });

    it('con un reto inexistente responde 403 OTP_REQUIRED', async () => {
      assert.equal((await activate(DNI_USER, 'otp-no-existe')).status, 403);
    });

    it('un reto verificado de OTRA persona no sirve (403)', async () => {
      const ceChallenge = await verifiedChallenge(CE_USER.userId);

      const result = await activate(DNI_USER, ceChallenge);

      assert.equal(result.status, 403);
      assert.equal(result.json.error, 'OTP_REQUIRED');
    });

    it('rechaza con 400 un otpChallengeId que no es texto', async () => {
      const result = await activate(DNI_USER, 123);

      assert.equal(result.status, 400);
      assert.equal(result.json.error, 'INVALID_REQUEST');
    });

    it('con el reto verificado activa la wallet (201 ACTIVE, saldo cero)', async () => {
      const challenge = await verifiedChallenge(DNI_USER.userId);

      const result = await activate(DNI_USER, challenge);

      assert.equal(result.status, 201);
      assert.equal(result.json.status, 'ACTIVE');
      assert.deepEqual(Object.keys(result.json).sort(), ['id', 'scenario', 'status', 'wallet_id']);
      assert.equal((await call('GET', `/wallets/${result.json.wallet_id}`)).json.balance, 0);
    });

    it('funciona igual con carné de extranjería', async () => {
      const challenge = await verifiedChallenge(CE_USER.userId);

      assert.equal((await activate(CE_USER, challenge)).status, 201);
    });

    it('el OTP se consume: no se puede reutilizar (403) ni verificar de nuevo (409)', async () => {
      const challenge = await verifiedChallenge(DNI_USER.userId);
      await activate(DNI_USER, challenge);
      const before = walletCount();

      const reused = await activate(DNI_USER, challenge);
      const verifyAgain = await verifyOtp(challenge, '123456');

      assert.equal(reused.status, 403);
      assert.equal(verifyAgain.status, 409);
      assert.equal(verifyAgain.json.error, 'OTP_ALREADY_USED');
      assert.equal(walletCount(), before);
    });

    it('un OTP verificado que venció responde 410 OTP_EXPIRED', async () => {
      const challenge = await verifiedChallenge(DNI_USER.userId);
      clock += 301 * 1000;

      const result = await activate(DNI_USER, challenge);

      assert.equal(result.status, 410);
      assert.deepEqual(result.json, { error: 'OTP_EXPIRED' });
    });

    it('si el proveedor no está disponible (503) el OTP no se consume y se puede reintentar', async () => {
      const challenge = await verifiedChallenge(DNI_USER.userId);
      setSettings({ scenarioOverride: 'UNAVAILABLE' });
      assert.equal((await activate(DNI_USER, challenge)).status, 503);

      setSettings({ scenarioOverride: null });
      assert.equal((await activate(DNI_USER, challenge)).status, 201);
    });

    it('documento no coincidente (422) se comprueba antes del OTP y no lo consume', async () => {
      const challenge = await verifiedChallenge(DNI_USER.userId);

      const mismatch = await activate({ ...DNI_USER, document: 'otro-numero' }, challenge);
      const ok = await activate(DNI_USER, challenge);

      assert.equal(mismatch.status, 422);
      assert.equal(ok.status, 201);
    });

    it('persona inexistente (404) se responde antes de pedir el OTP', async () => {
      const result = await activate({
        ...DNI_USER,
        userId: '11111111-2222-4333-8444-555555555555',
      });

      assert.equal(result.status, 404);
      assert.equal(result.json.error, 'PERSON_NOT_FOUND');
    });

    it('activación repetida: con un OTP nuevo devuelve 200 con la wallet existente y lo consume', async () => {
      const first = await activate(DNI_USER, await verifiedChallenge(DNI_USER.userId));
      const walletsAfterFirst = walletCount();
      const secondChallenge = await verifiedChallenge(DNI_USER.userId);

      const second = await activate(DNI_USER, secondChallenge);
      const reused = await activate(DNI_USER, secondChallenge);

      assert.equal(second.status, 200);
      assert.deepEqual(second.json, first.json);
      assert.equal(walletCount(), walletsAfterFirst);
      assert.equal(reused.status, 403);
    });

    it('activación repetida sin OTP tampoco devuelve la wallet (403)', async () => {
      await activate(DNI_USER, await verifiedChallenge(DNI_USER.userId));

      assert.equal((await activate(DNI_USER)).status, 403);
    });

    it('la forma heredada TEST no requiere OTP (compatibilidad)', async () => {
      const result = await call('POST', '/kyc/verifications', {
        documentType: 'TEST',
        document: 'TEST-001',
      });

      assert.equal(result.status, 201);
    });
  });

  describe('db.json anterior', () => {
    it('un db.json sin otpChallenges se completa y el flujo funciona', async () => {
      const db = readDb();
      delete db.otpChallenges;
      writeFileSync(dbFile, JSON.stringify(db));

      const challenge = await verifiedChallenge(DNI_USER.userId);

      assert.equal((await activate(DNI_USER, challenge)).status, 201);
    });
  });
});
