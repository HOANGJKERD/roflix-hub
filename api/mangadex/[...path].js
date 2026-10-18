// RoHub MangaDex API proxy (Vercel Serverless Function, CommonJS).
// Only documented read-only MangaDex endpoints are allowed.
const ORIGIN = 'https://api.mangadex.org';
const TIMEOUT_MS = 12000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendError(res, status, code, message, extra) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(Object.assign({ error: message, code }, extra || {}));
}
function endpointAllowed(parts) {
  if (!parts.length || parts.some(p => !p || p === '.' || p === '..')) return false;
  if (parts.length === 1 && parts[0] === 'manga') return true;
  if (parts.length === 2 && parts[0] === 'manga' && UUID.test(parts[1])) return true;
  if (parts.length === 3 && parts[0] === 'manga' && UUID.test(parts[1]) && parts[2] === 'feed') return true;
  if (parts.length === 3 && parts[0] === 'at-home' && parts[1] === 'server' && UUID.test(parts[2])) return true;
  return false;
}
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET is supported');

  // Vercel catch-all functions do not expose the dynamic path identically in every
  // deployment/runtime. Prefer req.query.path when present, otherwise parse the
  // pathname so /api/mangadex/manga is resolved as ["manga"].
  let raw = req.query && req.query.path;
  if (raw == null) {
    try {
      const pathname = new URL(req.url, 'https://rohub.invalid').pathname;
      const marker = '/api/mangadex/';
      const markerIndex = pathname.indexOf(marker);
      if (markerIndex >= 0) {
        raw = pathname.slice(markerIndex + marker.length).split('/').filter(Boolean).map(segment => {
          try { return decodeURIComponent(segment); } catch (_) { return segment; }
        });
      }
    } catch (_) {}
  }
  const parts = (Array.isArray(raw) ? raw : raw == null ? [] : [raw]).map(String);
  if (!endpointAllowed(parts)) {
    return sendError(res, 400, 'ENDPOINT_NOT_ALLOWED', 'MangaDex endpoint or identifier is not allowed');
  }

  let incoming;
  try { incoming = new URL(req.url, 'https://rohub.invalid'); }
  catch (_) { return sendError(res, 400, 'INVALID_URL', 'Invalid request URL'); }
  const params = new URLSearchParams();
  incoming.searchParams.forEach((value, key) => {
    if (key !== 'path' && key !== '_rf') params.append(key, value);
  });
  const target = ORIGIN + '/' + parts.map(encodeURIComponent).join('/') + (params.toString() ? '?' + params.toString() : '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let upstream;
  try {
    upstream = await fetch(target, {
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': 'RoHub-MangaDex-Proxy/1.0' },
      signal: controller.signal
    });
    const body = await upstream.text();
    if (upstream.status === 429) {
      const retry = upstream.headers.get('retry-after');
      if (retry) res.setHeader('Retry-After', retry);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(429).send(JSON.stringify({ error: 'MangaDex rate limit reached', code: 'UPSTREAM_RATE_LIMITED', retryAfter: retry || null }));
    }
    if (!upstream.ok) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
      return res.status(upstream.status).send(body);
    }
    let parsed;
    try { parsed = JSON.parse(body); }
    catch (_) { return sendError(res, 502, 'UPSTREAM_BAD_RESPONSE', 'MangaDex returned invalid JSON'); }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', parts[0] === 'at-home' ? 'public, s-maxage=60, stale-while-revalidate=120' : 'public, s-maxage=120, stale-while-revalidate=300');
    return res.status(upstream.status).send(JSON.stringify(parsed));
  } catch (error) {
    if (error && error.name === 'AbortError') return sendError(res, 504, 'UPSTREAM_TIMEOUT', 'MangaDex API request timed out');
    return sendError(res, 502, 'UPSTREAM_NETWORK_ERROR', 'Could not reach MangaDex API');
  } finally {
    clearTimeout(timer);
  }
};
module.exports._test = { endpointAllowed, UUID, TIMEOUT_MS };
