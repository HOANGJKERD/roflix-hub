const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/b2-playback.js');

function makeRes() {
  return {
    statusCode: 200, headers: {}, body: undefined,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; }
  };
}

test('B2 signer allows only known RoFlix storage prefixes and video extensions', () => {
  const { safeObjectKey } = handler._test;
  assert.equal(safeObjectKey('ben 10/season 1/episode 01.mp4'), 'ben 10/season 1/episode 01.mp4');
  assert.equal(safeObjectKey('roflix/movie-123/master.m3u8'), '');
  assert.equal(safeObjectKey('../secrets.mp4'), '');
  assert.equal(safeObjectKey('other-app/private.mp4'), '');
  assert.equal(safeObjectKey('ben 10/../../private.mp4'), '');
  assert.equal(safeObjectKey('ben 10/episode.exe'), '');
});

test('B2 SigV4 URL encodes UTF-8 and spaces in object keys', () => {
  const { signedGetUrl } = handler._test;
  const url = signedGetUrl({
    endpoint: 'https://s3.us-east-005.backblazeb2.com',
    bucket: 'rohub-storage',
    region: 'us-east-005',
    accessKeyId: 'test-key-id',
    secretAccessKey: 'test-secret',
    key: 'ben 10/Tập 01.mp4',
    expires: 7200,
    now: new Date('2026-11-12T00:00:00.000Z')
  });
  assert.match(url, /^https:\/\/s3\.us-east-005\.backblazeb2\.com\/rohub-storage\/ben%2010\/T%E1%BA%ADp%2001\.mp4\?/);
  assert.match(url, /X-Amz-Signature=[a-f0-9]{64}$/);
  assert.match(url, /X-Amz-Expires=7200/);
});

test('B2 endpoint rejects unsupported methods', async () => {
  const res = makeRes();
  await handler({ method: 'POST', query: {}, headers: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error, 'method_not_allowed');
});

test('B2 endpoint rejects object keys outside the allowlist before checking credentials', async () => {
  const res = makeRes();
  await handler({ method: 'GET', query: { key: '../private.mp4' }, headers: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'invalid_or_disallowed_object_key');
});

test('B2 endpoint issues a signed playback URL without a Supabase session', async () => {
  const names = ['B2_ENDPOINT', 'B2_REGION', 'B2_BUCKET', 'B2_ACCESS_KEY_ID', 'B2_SECRET_ACCESS_KEY'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  Object.assign(process.env, {
    B2_ENDPOINT: 'https://s3.us-east-005.backblazeb2.com',
    B2_REGION: 'us-east-005',
    B2_BUCKET: 'rohub-storage',
    B2_ACCESS_KEY_ID: 'test-key-id',
    B2_SECRET_ACCESS_KEY: 'test-secret'
  });
  try {
    const res = makeRes();
    await handler({ method: 'GET', query: { key: 'ben 10/episode 01.mp4' }, headers: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.expiresIn, 7200);
    assert.match(res.body.url, /X-Amz-Expires=7200/);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
