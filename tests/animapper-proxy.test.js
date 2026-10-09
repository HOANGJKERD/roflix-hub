const test = require('node:test');
const assert = require('node:assert/strict');

const handler = require('../api/animapper.js');

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    send(value) { this.body = value; return this; },
    end() { return this; }
  };
}
function response(status, body, headers) {
  const h = Object.assign({ 'content-type': 'application/json' }, headers || {});
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get(name) { return h[String(name).toLowerCase()] || null; } },
    async text() { return body; }
  };
}
async function invoke(path, query) {
  const req = { method: 'GET', query: Object.assign({ path }, query || {}) };
  const res = makeRes();
  await handler(req, res);
  return res;
}
const originalFetch = global.fetch;
const originalLog = console.log;
test.beforeEach(() => { console.log = function () {}; });
test.afterEach(() => { global.fetch = originalFetch; console.log = originalLog; });

test('200 JSON source URL is returned and cached longer', async () => {
  global.fetch = async () => response(200, JSON.stringify({ server: 'DU', type: 'HLS', url: 'https://api.animapper.net/api/v1/stream/source/m3u8/example' }));
  const res = await invoke('/stream/source?episodeData=a516$9803&provider=ANIMEVIETSUB&server=DU');
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).type, 'HLS');
  assert.match(res.headers['cache-control'], /s-maxage=3600/);
  assert.match(res.headers['cache-control'], /stale-while-revalidate=86400/);
});

test('upstream 429 with empty body is classified and Retry-After preserved', async () => {
  global.fetch = async () => response(429, '', { 'retry-after': '45' });
  const res = await invoke('/stream/episodes?id=20');
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.code, 'UPSTREAM_RATE_LIMITED');
  assert.equal(res.body.retryAfter, 45);
  assert.equal(res.headers['retry-after'], '45');
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('AbortError becomes 504 UPSTREAM_TIMEOUT without retry', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; const e = new Error('aborted'); e.name = 'AbortError'; throw e; };
  const res = await invoke('/stream/source?episodeData=a516$9803&provider=ANIMEVIETSUB&server=DU');
  assert.equal(res.statusCode, 504);
  assert.equal(res.body.code, 'UPSTREAM_TIMEOUT');
  assert.equal(calls, 1);
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('network failure retries exactly once, then returns 502', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; throw new TypeError('network down'); };
  const res = await invoke('/search?title=naruto');
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.code, 'UPSTREAM_NETWORK');
  assert.equal(calls, 2);
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('HTTP 200 HTML is classified as bad response', async () => {
  global.fetch = async () => response(200, '<html>blocked</html>', { 'content-type': 'text/html' });
  const res = await invoke('/stream/source?episodeData=a516$9803&provider=ANIMEVIETSUB&server=DU');
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.code, 'UPSTREAM_BAD_RESPONSE');
});

test('HTTP 200 source JSON without URL is classified as bad response', async () => {
  global.fetch = async () => response(200, JSON.stringify({ server: 'DU', type: 'HLS' }));
  const res = await invoke('/stream/source?episodeData=a516$9803&provider=ANIMEVIETSUB&server=DU');
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.code, 'UPSTREAM_BAD_RESPONSE');
});

test('endpoint outside allowlist is rejected without upstream request', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; throw new Error('must not call'); };
  const res = await invoke('/admin');
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, 'ENDPOINT_NOT_ALLOWED');
  assert.equal(calls, 0);
});

test('ordinary success cache policy remains and errors are no-store', async () => {
  global.fetch = async () => response(200, JSON.stringify({ results: [] }));
  const ok = await invoke('/search?title=naruto');
  assert.match(ok.headers['cache-control'], /s-maxage=300/);
  global.fetch = async () => response(503, 'upstream unavailable', { 'content-type': 'text/plain' });
  const bad = await invoke('/search?title=naruto');
  assert.equal(bad.statusCode, 503);
  assert.equal(bad.headers['cache-control'], 'no-store');
});
