// Vercel serverless proxy cho AniMapper (JSON), CommonJS.
const ORIGIN = 'https://api.animapper.net/api/v1';
const ALLOWED = new Set(['/search', '/metadata', '/stream/episodes', '/stream/episodes/servers', '/stream/source']);
const DROP_PARAMS = new Set(['path', '_rf']);
const TIMEOUT_MS = 20000;
const SOURCE_CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400';
const DEFAULT_CACHE = 'public, s-maxage=300, stale-while-revalidate=600';

function cacheHeader(path) {
  return path === '/stream/source' ? SOURCE_CACHE : DEFAULT_CACHE;
}
function logSafe(path, status, ms, code) {
  console.log(JSON.stringify({ component: 'animapper-proxy', path: path, status: status, ms: ms, code: code || 'OK' }));
}
function jsonError(res, status, code, error, extra) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(Object.assign({ error: error, code: code }, extra || {}));
}
function validSourceJson(path, parsed) {
  if (path !== '/stream/source') return true;
  const data = parsed && (parsed.result || parsed.data || parsed);
  return !!(data && typeof data.url === 'string' && data.url.trim());
}
async function fetchOnce(target, signal) {
  return fetch(target, {
    method: 'GET',
    headers: { Accept: 'application/json', 'User-Agent': 'RoFlix-AniMapper/1.2' },
    signal: signal
  });
}

module.exports = async function handler(req, res) {
  const started = Date.now();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return jsonError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed');

  const rawPath = String((req.query && req.query.path) || '');
  let parsed;
  try { parsed = new URL(rawPath, 'https://x.invalid'); }
  catch (_) { return jsonError(res, 400, 'INVALID_PATH', 'Invalid path'); }
  const path = parsed.pathname;
  if (!ALLOWED.has(path)) return jsonError(res, 400, 'ENDPOINT_NOT_ALLOWED', 'AniMapper endpoint not allowed');

  const params = new URLSearchParams();
  parsed.searchParams.forEach(function (v, k) { if (!DROP_PARAMS.has(k)) params.set(k, v); });
  Object.keys(req.query || {}).forEach(function (k) {
    if (DROP_PARAMS.has(k)) return;
    const v = req.query[k];
    (Array.isArray(v) ? v : [v]).forEach(function (x) { if (x != null) params.set(k, String(x)); });
  });
  const target = ORIGIN + path + (params.toString() ? '?' + params.toString() : '');

  let upstream;
  let text;
  let attempt = 0;
  while (true) {
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    try {
      upstream = await fetchOnce(target, ctrl.signal);
      text = await upstream.text();
      clearTimeout(timer);
      break;
    } catch (error) {
      clearTimeout(timer);
      if (error && error.name === 'AbortError') {
        logSafe(path, 504, Date.now() - started, 'UPSTREAM_TIMEOUT');
        return jsonError(res, 504, 'UPSTREAM_TIMEOUT', 'AniMapper upstream timed out');
      }
      if (attempt === 0) {
        attempt++;
        await new Promise(function (resolve) { setTimeout(resolve, 250); });
        continue;
      }
      logSafe(path, 502, Date.now() - started, 'UPSTREAM_NETWORK');
      return jsonError(res, 502, 'UPSTREAM_NETWORK', 'AniMapper network error');
    }
  }

  if (upstream.status === 429) {
    const retryHeader = upstream.headers && upstream.headers.get('retry-after');
    const retryAfter = retryHeader && /^\d+$/.test(retryHeader) ? Number(retryHeader) : undefined;
    const extra = {};
    if (retryHeader) extra.retryAfter = retryAfter === undefined ? retryHeader : retryAfter;
    if (retryHeader) res.setHeader('Retry-After', retryHeader);
    logSafe(path, 429, Date.now() - started, 'UPSTREAM_RATE_LIMITED');
    return jsonError(res, 429, 'UPSTREAM_RATE_LIMITED', 'AniMapper rate limit reached', extra);
  }

  if (!upstream.ok) {
    logSafe(path, upstream.status, Date.now() - started, 'UPSTREAM_HTTP_ERROR');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    return res.status(upstream.status).send(text);
  }

  let body;
  try { body = JSON.parse(text); }
  catch (_) {
    logSafe(path, 502, Date.now() - started, 'UPSTREAM_BAD_RESPONSE');
    return jsonError(res, 502, 'UPSTREAM_BAD_RESPONSE', 'AniMapper returned a non-JSON response');
  }
  if (!validSourceJson(path, body)) {
    logSafe(path, 502, Date.now() - started, 'UPSTREAM_BAD_RESPONSE');
    return jsonError(res, 502, 'UPSTREAM_BAD_RESPONSE', 'AniMapper source response did not contain a URL');
  }

  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheHeader(path));
  logSafe(path, upstream.status, Date.now() - started, 'OK');
  return res.status(upstream.status).send(text);
};

module.exports._test = { cacheHeader, validSourceJson, ALLOWED, TIMEOUT_MS };
