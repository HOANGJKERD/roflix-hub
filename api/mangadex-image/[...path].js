// RoHub MangaDex chapter-image proxy (Vercel Serverless Function, CommonJS).
// Restricts requests to MangaDex's image host and safe /data/{hash}/{filename} paths.
const ORIGIN = 'https://uploads.mangadex.org';
const TIMEOUT_MS = 15000;
const HASH = /^[0-9a-f]{32}$/i;
const FILE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,240}$/;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);

function sendError(res, status, code, message, extra) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(Object.assign({ error: message, code }, extra || {}));
}
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET and HEAD are supported');

  const raw = req.query && req.query.path;
  const parts = (Array.isArray(raw) ? raw : raw == null ? [] : [raw]).map(String);
  if (parts.length !== 3 || parts[0] !== 'data' || !HASH.test(parts[1]) || !FILE.test(parts[2]) || parts[2] === '.' || parts[2] === '..') {
    return sendError(res, 400, 'INVALID_IMAGE_PATH', 'Expected /data/{32-character-hash}/{filename}');
  }
  const target = ORIGIN + '/data/' + parts[1] + '/' + encodeURIComponent(parts[2]);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: { Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8', 'User-Agent': 'RoHub-MangaDex-Image-Proxy/1.0' },
      signal: controller.signal
    });
    if (upstream.status === 429) {
      const retry = upstream.headers.get('retry-after');
      if (retry) res.setHeader('Retry-After', retry);
      return sendError(res, 429, 'UPSTREAM_RATE_LIMITED', 'MangaDex image rate limit reached', retry ? { retryAfter: retry } : undefined);
    }
    if (!upstream.ok) {
      const status = [400, 403, 404, 410, 451].includes(upstream.status) ? upstream.status : 502;
      return sendError(res, status, 'UPSTREAM_IMAGE_ERROR', 'MangaDex image server returned HTTP ' + upstream.status, { upstreamStatus: upstream.status });
    }
    const contentType = String(upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!IMAGE_TYPES.has(contentType)) return sendError(res, 502, 'UPSTREAM_NOT_IMAGE', 'MangaDex did not return a supported image', { contentType: contentType || null });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const length = upstream.headers.get('content-length');
    if (length && /^\d+$/.test(length)) res.setHeader('Content-Length', length);
    if (req.method === 'HEAD') {
      if (upstream.body && typeof upstream.body.cancel === 'function') await upstream.body.cancel();
      return res.status(200).end();
    }
    const bytes = Buffer.from(await upstream.arrayBuffer());
    return res.status(200).send(bytes);
  } catch (error) {
    if (error && error.name === 'AbortError') return sendError(res, 504, 'UPSTREAM_TIMEOUT', 'MangaDex image request timed out');
    return sendError(res, 502, 'UPSTREAM_NETWORK_ERROR', 'Could not reach MangaDex image server');
  } finally {
    clearTimeout(timer);
  }
};
module.exports._test = { HASH, FILE, IMAGE_TYPES, TIMEOUT_MS };
