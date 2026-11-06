import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import { SEED_FILE, createMockServer, createStore } from './server.mjs';

describe('mock del Wallet (W1) con base de datos en archivo', () => {
  let dir;
  let dbFile;
  let store;
  let server;
  let base;
  const logs = [];

  before(async () => {
    dir = mkdtempSync(join(tmpdir(), 'mock-wallet-'));
    dbFile = join(dir, 'db.json');
    store = createStore(dbFile);
    server = createMockServer({ store, log: (line) => logs.push(line) });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => store.reset());

  const call = async (method, path, body, headers = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      json: text ? JSON.parse(text) : undefined,
    };
  };
  const register = (scenario, extra = {}) =>
    call('POST', '/kyc/verifications', {
      documentType: 'TEST',
      document: 'TEST-001',
      scenario,
      ...extra,
    });
  const readDb = () => JSON.parse(readFileSync(dbFile, 'utf8'));

  describe('datos dummy iniciales', () => {
    it('crea db.json desde el seed si no existe', () => {
      const db = readDb();
      assert.ok(db.wallets.some((wallet) => wallet.id === 'wallet-demo'));
    });

    it('wallet-demo empieza ACTIVE con 100000', async () => {
      const { status, json } = await call('GET', '/wallets/wallet-demo');
      assert.equal(status, 200);
      assert.deepEqual(json, {
        id: 'wallet-demo',
        status: 'ACTIVE',
        balance: 100000,
        reserved: 0,
        available: 100000,
        currency: 'PEN',
      });
    });

    it('incluye una verificación activa, una pendiente y una rechazada', async () => {
      const statuses = await Promise.all(
        ['kyc-seed-active', 'kyc-seed-pending', 'kyc-seed-rejected'].map(
          async (id) => (await call('GET', `/kyc/verifications/${id}`)).json.status,
        ),
      );
      assert.deepEqual(statuses, ['ACTIVE', 'PENDING', 'REJECTED']);
    });

    it('incluye un caso de soporte abierto para la verificación pendiente', async () => {
      const { json } = await call('GET', '/support/cases');
      assert.deepEqual(json, [
        {
          id: 'case-seed-pending',
          resource: 'kyc-seed-pending',
          reason: 'KYC_REVIEW',
          status: 'OPEN',
        },
      ]);
    });
  });

  describe('POST /kyc/verifications', () => {
    it('APPROVED crea una wallet ACTIVE con saldo cero', async () => {
      const created = await register('APPROVED');

      assert.equal(created.status, 201);
      assert.equal(created.json.status, 'ACTIVE');
      assert.equal(created.json.scenario, 'APPROVED');
      assert.match(created.json.id, /^kyc-/);

      const wallet = await call('GET', `/wallets/${created.json.wallet_id}`);
      assert.equal(wallet.json.status, 'ACTIVE');
      assert.equal(wallet.json.balance, 0);
      assert.equal(wallet.json.available, 0);
    });

    it('usa APPROVED cuando se omite scenario', async () => {
      const created = await call('POST', '/kyc/verifications', {
        documentType: 'TEST',
        document: 'TEST-9',
      });

      assert.equal(created.status, 201);
      assert.equal(created.json.scenario, 'APPROVED');
    });

    it('MANUAL_REVIEW deja la cuenta PENDING y abre un caso de soporte', async () => {
      const created = await register('MANUAL_REVIEW');
      const cases = (await call('GET', '/support/cases')).json;

      assert.equal(created.json.status, 'PENDING');
      assert.ok(
        cases.some(
          (item) =>
            item.resource === created.json.id &&
            item.reason === 'KYC_REVIEW' &&
            item.status === 'OPEN',
        ),
      );
      assert.equal(
        (await call('GET', `/wallets/${created.json.wallet_id}`)).json.status,
        'PENDING',
      );
    });

    it('REJECTED crea una cuenta rechazada', async () => {
      const created = await register('REJECTED');

      assert.equal(created.json.status, 'REJECTED');
      assert.equal(
        (await call('GET', `/wallets/${created.json.wallet_id}`)).json.status,
        'REJECTED',
      );
    });

    it('UNAVAILABLE devuelve 503 KYC_UNAVAILABLE y no crea cuenta', async () => {
      const before = readDb();
      const result = await register('UNAVAILABLE');
      const after = readDb();

      assert.equal(result.status, 503);
      assert.deepEqual(result.json, { error: 'KYC_UNAVAILABLE' });
      assert.equal(after.wallets.length, before.wallets.length);
      assert.equal(after.verifications.length, before.verifications.length);
    });

    it('no evita registros repetidos del mismo documento', async () => {
      const first = await register('APPROVED');
      const second = await register('APPROVED');

      assert.equal(second.status, 201);
      assert.notEqual(first.json.id, second.json.id);
      assert.notEqual(first.json.wallet_id, second.json.wallet_id);
    });

    it('guarda los cambios en el archivo', async () => {
      const created = await register('APPROVED');

      assert.ok(readDb().verifications.some((item) => item.id === created.json.id));
    });

    it('no expone el documento en la respuesta', async () => {
      const created = await register('APPROVED');

      assert.deepEqual(Object.keys(created.json).sort(), ['id', 'scenario', 'status', 'wallet_id']);
    });

    for (const [name, body] of [
      ['documentType distinto de TEST', { documentType: 'DNI', document: 'TEST-1' }],
      ['document sin prefijo TEST-', { documentType: 'TEST', document: 'DNI-12345678' }],
      ['document vacío', { documentType: 'TEST', document: '' }],
      [
        'document de más de 200 caracteres',
        { documentType: 'TEST', document: `TEST-${'x'.repeat(200)}` },
      ],
      ['document ausente', { documentType: 'TEST' }],
      ['scenario no permitido', { documentType: 'TEST', document: 'TEST-1', scenario: 'OTRO' }],
    ]) {
      it(`rechaza con 400: ${name}`, async () => {
        const result = await call('POST', '/kyc/verifications', body);

        assert.equal(result.status, 400);
        assert.equal(result.json.error, 'INVALID_REQUEST');
      });
    }

    it('rechaza con 400 un JSON inválido', async () => {
      const result = await call('POST', '/kyc/verifications', '{no es json');

      assert.equal(result.status, 400);
      assert.equal(result.json.error, 'INVALID_JSON');
    });

    it('rechaza con 413 un cuerpo mayor a 65536 bytes', async () => {
      const result = await call('POST', '/kyc/verifications', {
        documentType: 'TEST',
        document: 'TEST-1',
        relleno: 'x'.repeat(70000),
      });

      assert.equal(result.status, 413);
    });
  });

  describe('GET /kyc/verifications/{id} y GET /wallets/{id}', () => {
    it('devuelven 404 NOT_FOUND si no existen', async () => {
      for (const path of ['/kyc/verifications/no-existe', '/wallets/no-existe']) {
        const result = await call('GET', path);

        assert.equal(result.status, 404);
        assert.deepEqual(result.json, { error: 'NOT_FOUND' });
      }
    });
  });

  describe('POST /kyc/verifications/{id}/decision', () => {
    it('ACTIVE activa la wallet y resuelve el caso de soporte', async () => {
      const created = await register('MANUAL_REVIEW');
      const decided = await call('POST', `/kyc/verifications/${created.json.id}/decision`, {
        decision: 'ACTIVE',
      });

      assert.equal(decided.status, 200);
      assert.equal(decided.json.status, 'ACTIVE');
      assert.equal((await call('GET', `/wallets/${created.json.wallet_id}`)).json.status, 'ACTIVE');
      const cases = (await call('GET', '/support/cases')).json;
      assert.equal(cases.find((item) => item.resource === created.json.id).status, 'RESOLVED');
    });

    it('REJECTED rechaza la wallet', async () => {
      const decided = await call('POST', '/kyc/verifications/kyc-seed-pending/decision', {
        decision: 'REJECTED',
      });

      assert.equal(decided.json.status, 'REJECTED');
      assert.equal((await call('GET', '/wallets/wallet-seed-pending')).json.status, 'REJECTED');
    });

    it('repetir la misma decisión conserva el resultado (200)', async () => {
      const path = '/kyc/verifications/kyc-seed-pending/decision';
      await call('POST', path, { decision: 'ACTIVE' });
      const repeated = await call('POST', path, { decision: 'ACTIVE' });

      assert.equal(repeated.status, 200);
      assert.equal(repeated.json.status, 'ACTIVE');
    });

    it('cambiar una decisión final devuelve 409 DECISION_CONFLICT', async () => {
      const path = '/kyc/verifications/kyc-seed-pending/decision';
      await call('POST', path, { decision: 'ACTIVE' });
      const changed = await call('POST', path, { decision: 'REJECTED' });

      assert.equal(changed.status, 409);
      assert.deepEqual(changed.json, { error: 'DECISION_CONFLICT' });
    });

    it('una cuenta ya rechazada no se puede activar (409)', async () => {
      const result = await call('POST', '/kyc/verifications/kyc-seed-rejected/decision', {
        decision: 'ACTIVE',
      });

      assert.equal(result.status, 409);
    });

    it('una decisión inválida devuelve 400 INVALID_DECISION', async () => {
      const result = await call('POST', '/kyc/verifications/kyc-seed-pending/decision', {
        decision: 'MAYBE',
      });

      assert.equal(result.status, 400);
      assert.deepEqual(result.json, { error: 'INVALID_DECISION' });
    });

    it('una verificación inexistente devuelve 404', async () => {
      const result = await call('POST', '/kyc/verifications/no-existe/decision', {
        decision: 'ACTIVE',
      });

      assert.equal(result.status, 404);
    });
  });

  describe('latencia simulada', () => {
    it('aplica X-Mock-Latency-Ms y lo devuelve en la respuesta', async () => {
      const started = Date.now();
      const result = await call('GET', '/wallets/wallet-demo', undefined, {
        'X-Mock-Latency-Ms': '150',
      });

      assert.equal(result.headers.get('x-mock-latency-ms'), '150');
      assert.ok(Date.now() - started >= 140);
    });

    it('acepta ?latency= y la cabecera tiene prioridad', async () => {
      const fromQuery = await call('GET', '/wallets/wallet-demo?latency=50');
      const both = await call('GET', '/wallets/wallet-demo?latency=50', undefined, {
        'X-Mock-Latency-Ms': '20',
      });

      assert.equal(fromQuery.headers.get('x-mock-latency-ms'), '50');
      assert.equal(both.headers.get('x-mock-latency-ms'), '20');
    });

    it('rechaza valores inválidos con 400 INVALID_MOCK_LATENCY', async () => {
      for (const value of ['5001', '-1', 'abc', '1.5']) {
        const result = await call('GET', '/wallets/wallet-demo', undefined, {
          'X-Mock-Latency-Ms': value,
        });

        assert.equal(result.status, 400, value);
        assert.equal(result.json.error, 'INVALID_MOCK_LATENCY');
      }
    });
  });

  describe('archivo como base de datos', () => {
    it('settings.scenarioOverride fuerza el escenario (se lee en cada solicitud)', async () => {
      const db = readDb();
      db.settings.scenarioOverride = 'MANUAL_REVIEW';
      writeFileSync(dbFile, JSON.stringify(db));

      const created = await register('APPROVED');

      assert.equal(created.json.scenario, 'MANUAL_REVIEW');
      assert.equal(created.json.status, 'PENDING');
    });

    it('un override UNAVAILABLE simula la caída del servicio', async () => {
      const db = readDb();
      db.settings.scenarioOverride = 'UNAVAILABLE';
      writeFileSync(dbFile, JSON.stringify(db));

      assert.equal((await register('APPROVED')).status, 503);
    });

    it('reset restaura los datos iniciales', async () => {
      await register('APPROVED');
      store.reset();

      const db = readDb();
      assert.equal(db.verifications.length, 3);
      assert.equal(db.settings.scenarioOverride, null);
    });

    it('un db.json corrupto responde 500 MOCK_DB_ERROR sin caerse', async () => {
      writeFileSync(dbFile, '{corrupto');

      const result = await call('GET', '/wallets/wallet-demo');

      assert.equal(result.status, 500);
      assert.equal(result.json.error, 'MOCK_DB_ERROR');
    });
  });

  // Personas ficticias del seed (db.seed.json): las pruebas no fijan sus datos. No usar datos reales.
  const seedPersons = JSON.parse(readFileSync(SEED_FILE, 'utf8')).persons;
  const toUser = (person) => ({
    userId: person.userId,
    documentType: person.document.type,
    document: person.document.number,
  });
  const DNI_USER = toUser(seedPersons.find((person) => person.document.type === 'DNI'));
  const CE_USER = toUser(seedPersons.find((person) => person.document.type === 'CE'));
  const DNI_NUMBER = DNI_USER.document;
  const CE_NUMBER = CE_USER.document;
  // Datos que nunca deben salir en las respuestas.
  const personSecrets = (user) => {
    const person = seedPersons.find((item) => item.userId === user.userId);
    return [person.firstName, person.lastName, person.birthDate, person.document.number];
  };
  const lookup = (documentType, documentNumber) =>
    call('POST', '/persons/lookup', { documentType, documentNumber });
  // El OTP simulado solo aparece en la consola del servidor: se lee de ahí, como haría una persona.
  const otpCodeFor = (userId) => {
    const line = [...logs]
      .reverse()
      .find((item) => item.includes('[OTP simulado]') && item.includes(userId.toLowerCase()));
    return line?.match(/: (\d{6}) \(/)?.[1];
  };
  const verifiedChallenge = async (userId) => {
    const created = await call('POST', '/otp/challenges', { userId });
    if (created.status !== 201) {
      return undefined;
    }
    await call('POST', `/otp/challenges/${created.json.challengeId}/verify`, {
      code: otpCodeFor(userId),
    });
    return created.json.challengeId;
  };
  const activate = async (user, extra = {}) =>
    call('POST', '/kyc/verifications', {
      ...user,
      otpChallengeId: await verifiedChallenge(user.userId),
      scenario: 'APPROVED',
      ...extra,
    });

  describe('consulta de persona (POST /persons/lookup, solo demo)', () => {
    it('encuentra a la persona con DNI y devuelve solo el userId', async () => {
      const result = await lookup('DNI', DNI_NUMBER);

      assert.equal(result.status, 200);
      assert.deepEqual(result.json, { userId: DNI_USER.userId });
    });

    it('encuentra a la persona con CE y devuelve solo el userId', async () => {
      const result = await lookup('CE', CE_NUMBER);

      assert.equal(result.status, 200);
      assert.deepEqual(result.json, { userId: CE_USER.userId });
    });

    it('un documento inexistente responde 404 PERSON_NOT_FOUND de forma explícita', async () => {
      const result = await lookup('DNI', '77777777');

      assert.equal(result.status, 404);
      assert.deepEqual(result.json, { error: 'PERSON_NOT_FOUND' });
    });

    it('el tipo importa: el número de un DNI no existe como CE', async () => {
      assert.equal((await lookup('CE', DNI_NUMBER)).status, 404);
      assert.equal((await lookup('DNI', CE_NUMBER)).status, 404);
    });

    it('la comparación es exacta: no normaliza espacios', async () => {
      assert.equal((await lookup('DNI', ' ' + DNI_NUMBER)).status, 404);
    });

    it('no devuelve nombre, apellido ni fecha de nacimiento', async () => {
      const text = JSON.stringify((await lookup('DNI', DNI_NUMBER)).json);

      for (const secret of [...personSecrets(DNI_USER), 'firstName', 'birthDate', 'persons']) {
        assert.ok(!text.includes(secret), secret);
      }
    });

    it('no admite la consulta por URL (el número no queda en registros de acceso)', async () => {
      const result = await call('GET', '/persons/lookup?documentType=DNI&documentNumber=00000001');

      assert.equal(result.status, 404);
      assert.deepEqual(result.json, { error: 'NOT_FOUND' });
    });

    it('no modifica la base de datos', async () => {
      const before = readFileSync(dbFile, 'utf8');
      await lookup('DNI', DNI_NUMBER);
      await lookup('DNI', '99999999');

      assert.equal(readFileSync(dbFile, 'utf8'), before);
    });

    for (const [name, body] of [
      ['tipo TEST', { documentType: 'TEST', documentNumber: '1' }],
      ['tipo desconocido', { documentType: 'PASAPORTE', documentNumber: '1' }],
      ['sin tipo', { documentNumber: DNI_NUMBER }],
      ['número vacío', { documentType: 'DNI', documentNumber: '' }],
      ['número ausente', { documentType: 'DNI' }],
      ['número que no es texto', { documentType: 'DNI', documentNumber: 1 }],
    ]) {
      it(`rechaza con 400: ${name}`, async () => {
        const result = await call('POST', '/persons/lookup', body);

        assert.equal(result.status, 400);
        assert.equal(result.json.error, 'INVALID_REQUEST');
      });
    }

    it('rechaza con 400 un cuerpo ausente', async () => {
      assert.equal((await call('POST', '/persons/lookup')).status, 400);
    });

    it('un db.json anterior, sin personas, se completa desde el seed', async () => {
      const db = readDb();
      delete db.persons;
      writeFileSync(dbFile, JSON.stringify(db));

      assert.equal((await lookup('DNI', DNI_NUMBER)).status, 200);
    });
  });

  describe('activación con DNI o CE (POST /kyc/verifications con userId)', () => {
    for (const [label, user] of [
      ['DNI', DNI_USER],
      ['CE', CE_USER],
    ]) {
      it(`happy path con ${label}: crea la verificación y una wallet ACTIVE con saldo cero`, async () => {
        const walletsBefore = readDb().wallets.length;
        const created = await activate(user);

        assert.equal(created.status, 201);
        assert.deepEqual(Object.keys(created.json).sort(), [
          'id',
          'scenario',
          'status',
          'wallet_id',
        ]);
        assert.match(created.json.id, /^kyc-/);
        assert.equal(created.json.scenario, 'APPROVED');
        assert.equal(created.json.status, 'ACTIVE');
        assert.equal(readDb().wallets.length, walletsBefore + 1);

        const verification = await call('GET', `/kyc/verifications/${created.json.id}`);
        assert.deepEqual(verification.json, created.json);

        const wallet = await call('GET', `/wallets/${created.json.wallet_id}`);
        assert.equal(wallet.status, 200);
        assert.equal(wallet.json.status, 'ACTIVE');
        assert.equal(wallet.json.balance, 0);
        assert.equal(wallet.json.available, 0);
        assert.equal(wallet.json.currency, 'PEN');
      });

      it(`flujo completo con ${label}: consulta la persona, verifica el OTP y activa con su userId`, async () => {
        const found = await lookup(user.documentType, user.document);
        const created = await activate({ ...user, userId: found.json.userId });

        assert.equal(created.status, 201);
        assert.equal(created.json.status, 'ACTIVE');
      });
    }

    it('asocia la verificación al usuario en la base de datos', async () => {
      const created = await activate(DNI_USER);
      const record = readDb().verifications.find((item) => item.id === created.json.id);

      assert.equal(record.userId, DNI_USER.userId);
    });

    it('acepta el GUID en mayúsculas', async () => {
      const created = await activate({ ...DNI_USER, userId: DNI_USER.userId.toUpperCase() });

      assert.equal(created.status, 201);
    });

    it('no expone datos de la persona en la respuesta', async () => {
      const text = JSON.stringify((await activate(DNI_USER)).json);

      for (const secret of [...personSecrets(DNI_USER), DNI_USER.userId]) {
        assert.ok(!text.includes(secret), secret);
      }
    });

    it('un userId inexistente responde 404 PERSON_NOT_FOUND y no crea nada', async () => {
      const before = readDb();
      const result = await activate({
        ...DNI_USER,
        userId: '11111111-2222-4333-8444-555555555555',
      });
      const after = readDb();

      assert.equal(result.status, 404);
      assert.deepEqual(result.json, { error: 'PERSON_NOT_FOUND' });
      assert.equal(after.wallets.length, before.wallets.length);
      assert.equal(after.verifications.length, before.verifications.length);
    });

    for (const [name, override] of [
      ['número que no coincide', { document: '99999999' }],
      ['tipo que no coincide', { documentType: 'CE' }],
      ['documento de otra persona', { document: CE_USER.document }],
    ]) {
      it(`documento no coincidente (${name}): 422 DOCUMENT_MISMATCH y no crea nada`, async () => {
        const before = readDb();
        const result = await activate({ ...DNI_USER, ...override });
        const after = readDb();

        assert.equal(result.status, 422);
        assert.deepEqual(result.json, { error: 'DOCUMENT_MISMATCH' });
        assert.equal(after.wallets.length, before.wallets.length);
        assert.equal(after.verifications.length, before.verifications.length);
      });
    }

    it('activación repetida: 200 con la verificación existente y sin segunda wallet', async () => {
      const first = await activate(DNI_USER);
      const walletsAfterFirst = readDb().wallets.length;
      const second = await activate(DNI_USER);

      assert.equal(first.status, 201);
      assert.equal(second.status, 200);
      assert.deepEqual(second.json, first.json);
      assert.equal(readDb().wallets.length, walletsAfterFirst);
      assert.equal(
        readDb().verifications.filter((item) => item.userId === DNI_USER.userId).length,
        1,
      );
    });

    it('activación repetida: el scenario solicitado se ignora', async () => {
      const first = await activate(DNI_USER);
      const second = await activate(DNI_USER, { scenario: 'REJECTED' });

      assert.equal(second.status, 200);
      assert.equal(second.json.status, 'ACTIVE');
      assert.equal(second.json.id, first.json.id);
    });

    it('activación repetida con revisión manual: conserva el estado y un solo caso de soporte', async () => {
      const first = await activate(CE_USER, { scenario: 'MANUAL_REVIEW' });
      const second = await activate(CE_USER, { scenario: 'MANUAL_REVIEW' });
      const cases = (await call('GET', '/support/cases')).json.filter(
        (item) => item.resource === first.json.id,
      );

      assert.equal(second.status, 200);
      assert.equal(second.json.status, 'PENDING');
      assert.equal(cases.length, 1);
    });

    it('cada persona tiene su propia wallet', async () => {
      const dni = await activate(DNI_USER);
      const ce = await activate(CE_USER);

      assert.notEqual(dni.json.wallet_id, ce.json.wallet_id);
    });

    it('tras un 503 no hay verificación previa: se puede activar después', async () => {
      const db = readDb();
      db.settings.scenarioOverride = 'UNAVAILABLE';
      writeFileSync(dbFile, JSON.stringify(db));
      assert.equal((await activate(DNI_USER)).status, 503);

      db.settings.scenarioOverride = null;
      writeFileSync(dbFile, JSON.stringify(db));
      assert.equal((await activate(DNI_USER)).status, 201);
    });

    describe('escenarios conservados con persona', () => {
      it('REJECTED crea una wallet rechazada', async () => {
        const created = await activate(DNI_USER, { scenario: 'REJECTED' });

        assert.equal(created.status, 201);
        assert.equal(created.json.status, 'REJECTED');
        assert.equal(
          (await call('GET', `/wallets/${created.json.wallet_id}`)).json.status,
          'REJECTED',
        );
      });

      it('MANUAL_REVIEW deja la cuenta PENDING y abre un caso de soporte', async () => {
        const created = await activate(CE_USER, { scenario: 'MANUAL_REVIEW' });
        const cases = (await call('GET', '/support/cases')).json;

        assert.equal(created.json.status, 'PENDING');
        assert.ok(
          cases.some((item) => item.resource === created.json.id && item.status === 'OPEN'),
        );
      });

      it('MANUAL_REVIEW se puede resolver con la decisión humana', async () => {
        const created = await activate(CE_USER, { scenario: 'MANUAL_REVIEW' });
        const decided = await call('POST', `/kyc/verifications/${created.json.id}/decision`, {
          decision: 'ACTIVE',
        });

        assert.equal(decided.json.status, 'ACTIVE');
        assert.equal(
          (await call('GET', `/wallets/${created.json.wallet_id}`)).json.status,
          'ACTIVE',
        );
      });

      it('UNAVAILABLE devuelve 503 y no crea cuenta', async () => {
        const before = readDb();
        const result = await activate(DNI_USER, { scenario: 'UNAVAILABLE' });

        assert.equal(result.status, 503);
        assert.deepEqual(result.json, { error: 'KYC_UNAVAILABLE' });
        assert.equal(readDb().wallets.length, before.wallets.length);
      });

      it('settings.scenarioOverride también aplica a la activación con persona', async () => {
        const db = readDb();
        db.settings.scenarioOverride = 'MANUAL_REVIEW';
        writeFileSync(dbFile, JSON.stringify(db));

        assert.equal((await activate(DNI_USER)).json.status, 'PENDING');
      });
    });

    for (const [name, body] of [
      ['sin userId', { documentType: 'DNI', document: DNI_NUMBER }],
      [
        'userId que no es GUID',
        { userId: 'no-es-un-guid', documentType: 'DNI', document: DNI_NUMBER },
      ],
      ['userId que no es texto', { userId: 123, documentType: 'DNI', document: DNI_NUMBER }],
      ['sin document', { userId: DNI_USER.userId, documentType: 'DNI' }],
      ['document vacío', { userId: DNI_USER.userId, documentType: 'DNI', document: '' }],
      [
        'documentType desconocido',
        { userId: DNI_USER.userId, documentType: 'PASAPORTE', document: '1' },
      ],
      ['scenario no permitido', { ...DNI_USER, scenario: 'OTRO' }],
    ]) {
      it(`rechaza con 400: ${name}`, async () => {
        const result = await call('POST', '/kyc/verifications', body);

        assert.equal(result.status, 400);
        assert.equal(result.json.error, 'INVALID_REQUEST');
      });
    }

    it('no fija longitud ni formato del número: cualquier texto no vacío se compara tal cual', async () => {
      const result = await activate({ ...DNI_USER, document: 'abc-123' });

      assert.equal(result.status, 422);
    });

    it('conserva la solicitud heredada TEST (sin userId) para clientes existentes', async () => {
      const created = await call('POST', '/kyc/verifications', {
        documentType: 'TEST',
        document: 'TEST-001',
        scenario: 'APPROVED',
      });

      assert.equal(created.status, 201);
      assert.equal(created.json.status, 'ACTIVE');
    });

    it('la solicitud TEST ignora un userId y sigue sin evitar altas repetidas', async () => {
      const body = { documentType: 'TEST', document: 'TEST-001', userId: DNI_USER.userId };
      const first = await call('POST', '/kyc/verifications', body);
      const second = await call('POST', '/kyc/verifications', body);

      assert.equal(first.status, 201);
      assert.equal(second.status, 201);
      assert.notEqual(first.json.wallet_id, second.json.wallet_id);
    });
  });

  describe('HTTP', () => {
    it('responde a OPTIONS con CORS (para el navegador)', async () => {
      const response = await fetch(`${base}/kyc/verifications`, { method: 'OPTIONS' });

      assert.equal(response.status, 204);
      assert.equal(response.headers.get('access-control-allow-origin'), '*');
      assert.match(response.headers.get('access-control-allow-headers'), /content-type/);
    });

    it('incluye CORS en las respuestas', async () => {
      const result = await call('GET', '/wallets/wallet-demo');

      assert.equal(result.headers.get('access-control-allow-origin'), '*');
    });

    it('una ruta desconocida devuelve 404 NOT_FOUND', async () => {
      const result = await call('GET', '/otra-cosa');

      assert.equal(result.status, 404);
      assert.deepEqual(result.json, { error: 'NOT_FOUND' });
    });
  });
});
