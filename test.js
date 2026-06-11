import test from 'node:test';
import assert from 'node:assert';
import { GestaoEapSDK } from './index.js';

// Save original fetch
const originalFetch = globalThis.fetch;

test('GestaoEapSDK Constructor', () => {
  // Test validation
  assert.throws(() => new GestaoEapSDK({ token: 'test' }), /baseUrl is required/);
  assert.throws(() => new GestaoEapSDK({ baseUrl: 'http://localhost' }), /token is required/);

  // Test trailing slash removal
  const sdk1 = new GestaoEapSDK({ baseUrl: 'http://localhost///', token: 'tok' });
  assert.strictEqual(sdk1.baseUrl, 'http://localhost');
  assert.strictEqual(sdk1.token, 'tok');

  const sdk2 = new GestaoEapSDK({ baseUrl: 'http://localhost', token: 'tok' });
  assert.strictEqual(sdk2.baseUrl, 'http://localhost');
});

test('GestaoEapSDK.addSaida local validation', async () => {
  const sdk = new GestaoEapSDK({ baseUrl: 'http://localhost', token: 'tok' });

  // Missing object
  const res1 = await sdk.addSaida(null);
  assert.strictEqual(res1.success, false);
  assert.match(res1.error, /Saída data object is required/);

  // Missing CODEAP
  const res2 = await sdk.addSaida({ CODCONTR: 1, PAGO: 10, DATA: '2026-06-10' });
  assert.strictEqual(res2.success, false);
  assert.match(res2.error, /CODEAP field is required/);

  // Missing CODCONTR
  const res3 = await sdk.addSaida({ CODEAP: '1', PAGO: 10, DATA: '2026-06-10' });
  assert.strictEqual(res3.success, false);
  assert.match(res3.error, /CODCONTR field is required/);

  // Missing PAGO
  const res4 = await sdk.addSaida({ CODEAP: '1', CODCONTR: 1, DATA: '2026-06-10' });
  assert.strictEqual(res4.success, false);
  assert.match(res4.error, /PAGO field is required/);

  // Missing DATA
  const res5 = await sdk.addSaida({ CODEAP: '1', CODCONTR: 1, PAGO: 10 });
  assert.strictEqual(res5.success, false);
  assert.match(res5.error, /DATA field is required/);
});

test('GestaoEapSDK.addSaida successful execution', async () => {
  const sdk = new GestaoEapSDK({ baseUrl: 'http://localhost', token: 'my-token' });

  const mockSaida = {
    CODEAP: '0001-0002',
    CODCONTR: 'CTR-123',
    PAGO: 500,
    DATA: '2026-06-10',
    CODIGO: 'TX-123'
  };

  // Mock global fetch
  globalThis.fetch = async (url, options) => {
    assert.strictEqual(url, 'http://localhost/api/saidas');
    assert.strictEqual(options.method, 'POST');
    assert.strictEqual(options.headers['Content-Type'], 'application/json');
    assert.strictEqual(options.headers['Authorization'], 'Bearer my-token');
    assert.strictEqual(options.body, JSON.stringify(mockSaida));

    return {
      ok: true,
      status: 200,
      headers: {
        get: (name) => name.toLowerCase() === 'content-type' ? 'application/json' : null
      },
      json: async () => ({ id: 'new-uuid', action: 'created' })
    };
  };

  try {
    const res = await sdk.addSaida(mockSaida);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.id, 'new-uuid');
    assert.strictEqual(res.data.action, 'created');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GestaoEapSDK.addSaida API error response (JSON)', async () => {
  const sdk = new GestaoEapSDK({ baseUrl: 'http://localhost', token: 'my-token' });

  globalThis.fetch = async () => {
    return {
      ok: false,
      status: 400,
      headers: {
        get: (name) => name.toLowerCase() === 'content-type' ? 'application/json' : null
      },
      json: async () => ({ error: 'Contract not found' })
    };
  };

  try {
    const res = await sdk.addSaida({
      CODEAP: '0001-0002',
      CODCONTR: 'CTR-123',
      PAGO: 500,
      DATA: '2026-06-10'
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.error, 'Contract not found');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GestaoEapSDK.addSaida API error response (Text)', async () => {
  const sdk = new GestaoEapSDK({ baseUrl: 'http://localhost', token: 'my-token' });

  globalThis.fetch = async () => {
    return {
      ok: false,
      status: 500,
      headers: {
        get: () => 'text/plain'
      },
      text: async () => 'Internal Server Error'
    };
  };

  try {
    const res = await sdk.addSaida({
      CODEAP: '0001-0002',
      CODCONTR: 'CTR-123',
      PAGO: 500,
      DATA: '2026-06-10'
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.error, 'Internal Server Error');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GestaoEapSDK.addSaida network failure', async () => {
  const sdk = new GestaoEapSDK({ baseUrl: 'http://localhost', token: 'my-token' });

  globalThis.fetch = async () => {
    throw new Error('Connection refused');
  };

  try {
    const res = await sdk.addSaida({
      CODEAP: '0001-0002',
      CODCONTR: 'CTR-123',
      PAGO: 500,
      DATA: '2026-06-10'
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'Connection refused');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GestaoEapSDK.addSaidas local validation', async () => {
  const sdk = new GestaoEapSDK({ baseUrl: 'http://localhost', token: 'tok' });

  // Not an array
  const res1 = await sdk.addSaidas('not-an-array');
  assert.strictEqual(res1.success, false);
  assert.match(res1.error, /Input must be an array of Saída objects/);

  // Empty array
  const res2 = await sdk.addSaidas([]);
  assert.strictEqual(res2.success, false);
  assert.match(res2.error, /Array cannot be empty/);

  // Invalid item in array
  const res3 = await sdk.addSaidas([
    { CODEAP: '1', CODCONTR: 1, PAGO: 10, DATA: '2026-06-10' },
    { CODEAP: '2', PAGO: 10, DATA: '2026-06-10' } // Missing CODCONTR
  ]);
  assert.strictEqual(res3.success, false);
  assert.match(res3.error, /Item at index 1 is missing required fields/);
});

test('GestaoEapSDK.addSaidas successful execution', async () => {
  const sdk = new GestaoEapSDK({ baseUrl: 'http://localhost', token: 'my-token' });

  const mockSaidas = [
    { CODEAP: '0001-0002', CODCONTR: 'CTR-123', PAGO: 500, DATA: '2026-06-10' },
    { CODEAP: '0001-0003', CODCONTR: 'CTR-123', PAGO: 1500, DATA: '2026-06-11' }
  ];

  globalThis.fetch = async (url, options) => {
    assert.strictEqual(url, 'http://localhost/api/saidas');
    assert.strictEqual(options.method, 'POST');
    assert.strictEqual(options.body, JSON.stringify(mockSaidas));

    return {
      ok: true,
      status: 200,
      headers: {
        get: (name) => name.toLowerCase() === 'content-type' ? 'application/json' : null
      },
      json: async () => ({
        results: [
          { success: true, id: 'id-1', action: 'created' },
          { success: true, id: 'id-2', action: 'created' }
        ]
      })
    };
  };

  try {
    const res = await sdk.addSaidas(mockSaidas);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.results.length, 2);
    assert.strictEqual(res.data.results[0].id, 'id-1');
    assert.strictEqual(res.data.results[1].id, 'id-2');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
