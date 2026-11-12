// RoHub MangaDex image proxy. Catch-all route accepts image paths in the URL pathname.
const DEFAULT_HOST = 'uploads.mangadex.org';
const TIMEOUT_MS = 20000;
const HASH = /^[0-9a-f]{32}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FILE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,240}$/;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);

function sendError(res, status, code, message, extra) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(Object.assign({ error: message, code }, extra || {}));
}
function allowedHost(value) {
  const host = String(value || DEFAULT_HOST).toLowerCase().replace(/\.$/, '');
  return host === 'uploads.mangadex.org' || host === 'mangadex.org' || /^[a-z0-9-]+\.mangadex\.(?:org|network)$/.test(host);
}
function resolveImagePath(parts) {
  if (parts.length === 3 && ['data', 'data-saver'].includes(parts[0]) && HASH.test(parts[1]) && FILE.test(parts[2]) && parts[2] !== '.' && parts[2] !== '..') {
    return '/' + parts.map(encodeURIComponent).join('/');
  }
  if (parts.length === 3 && parts[0] === 'covers' && UUID.test(parts[1]) && FILE.test(parts[2]) && parts[2] !== '.' && parts[2] !== '..') {
    return '/' + parts.map(encodeURIComponent).join('/');
  }
  return null;
}
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET and HEAD are supported');

  // Match the MangaDex API proxy: some Vercel runtimes omit the catch-all
  // parameter from req.query, so parse the actual URL pathname first.
  let parts = [];
  try {
    const incoming = new URL(req.url, 'https://rohub.invalid');
    const marker = '/api/mangadex-image/';
    const markerIndex = incoming.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      parts = incoming.pathname.slice(markerIndex + marker.length).split('/').filter(Boolean).map(segment => {
        try { return decodeURIComponent(segment); } catch (_) { return segment; }
      });
    }
  } catch (_) {}
  if (!parts.length) {
    const raw = req.query && req.query.path;
    if (Array.isArray(raw)) parts = raw.map(String);
    else if (typeof raw === 'string' && raw.trim()) parts = raw.split('/').filter(Boolean).map(segment => {
      try { return decodeURIComponent(segment); } catch (_) { return segment; }
    });
  }
  const imagePath = resolveImagePath(parts);
  if (!imagePath) return sendError(res, 400, 'INVALID_IMAGE_PATH', 'Expected /api/mangadex-image/data/{hash}/{filename}, /data-saver/{hash}/{filename}, or /covers/{mangaId}/{filename}');
  let host = DEFAULT_HOST;
  try {
    const incoming = new URL(req.url, 'https://rohub.invalid');
    host = incoming.searchParams.get('host') || (req.query && req.query.host) || DEFAULT_HOST;
  } catch (_) { host = (req.query && req.query.host) || DEFAULT_HOST; }
  host = String(host).toLowerCase();
  if (!allowedHost(host)) return sendError(res, 400, 'INVALID_IMAGE_HOST', 'Image host is not an allowed MangaDex host');

  const target = 'https://' + host + imagePath;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: { Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8', 'User-Agent': 'RoHub-MangaDex-Image-Proxy/1.1', Referer: 'https://mangadex.org/' },
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
    return res.status(200).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    if (error && error.name === 'AbortError') return sendError(res, 504, 'UPSTREAM_TIMEOUT', 'MangaDex image request timed out');
    return sendError(res, 502, 'UPSTREAM_NETWORK_ERROR', 'Could not reach MangaDex image server');
  } finally {
    clearTimeout(timer);
  }
};
module.exports._test = { HASH, UUID, FILE, IMAGE_TYPES, TIMEOUT_MS, allowedHost, resolveImagePath };
