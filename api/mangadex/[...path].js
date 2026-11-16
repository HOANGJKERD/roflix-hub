// RoHub MangaDex API proxy (Vercel Serverless Function, CommonJS).
// Only documented read-only MangaDex endpoints are allowed.
// Chapter images are served from /api/mangadex/image because a separate
// image function is not deployed on the Vercel Hobby function limit.
const ORIGIN = 'https://api.mangadex.org';
const TIMEOUT_MS = 12000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const IMAGE_HASH = /^[0-9a-f]{32}$/i;
const IMAGE_FILE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,240}$/;

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
function allowedImageHost(value) {
  const host = String(value || 'uploads.mangadex.org').toLowerCase().replace(/\.$/, '');
  return host === 'uploads.mangadex.org' || host === 'mangadex.org' || /^[a-z0-9-]+\.mangadex\.(?:org|network)$/.test(host);
}
function resolveImagePath(rawPath) {
  const parts = String(rawPath || '').replace(/^\/+/, '').split('/').filter(Boolean).map(segment => {
    try { return decodeURIComponent(segment); } catch (_) { return segment; }
  });
  if (parts.length === 3 && ['data', 'data-saver'].includes(parts[0]) && IMAGE_HASH.test(parts[1]) && IMAGE_FILE.test(parts[2]) && parts[2] !== '.' && parts[2] !== '..') {
    return '/' + parts.map(encodeURIComponent).join('/');
  }
  if (parts.length === 3 && parts[0] === 'covers' && UUID.test(parts[1]) && IMAGE_FILE.test(parts[2]) && parts[2] !== '.' && parts[2] !== '..') {
    return '/' + parts.map(encodeURIComponent).join('/');
  }
  return '';
}
function queryValue(req, incoming, key) {
  const fromUrl = incoming && incoming.searchParams ? incoming.searchParams.get(key) : '';
  if (fromUrl) return fromUrl;
  const value = req && req.query ? req.query[key] : '';
  if (Array.isArray(value)) return String(value[0] || '');
  return typeof value === 'string' ? value : '';
}
async function serveMangaDexImage(req, res, incoming) {
  const kind = queryValue(req, incoming, 'kind');
  const hash = queryValue(req, incoming, 'hash');
  const name = queryValue(req, incoming, 'name');
  const built = kind && hash && name ? '/' + kind + '/' + hash + '/' + name : '';
  const imagePath = resolveImagePath(built || queryValue(req, incoming, 'img') || (incoming.searchParams.get('path') || ''));
  const host = String(queryValue(req, incoming, 'host') || 'uploads.mangadex.org').toLowerCase();
  if (!imagePath) return sendError(res, 400, 'INVALID_IMAGE_PATH', 'Expected path /data/{hash}/{file}, /data-saver/{hash}/{file}, or /covers/{mangaId}/{file}');
  if (!allowedImageHost(host)) return sendError(res, 400, 'INVALID_IMAGE_HOST', 'Image host is not an allowed MangaDex host');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const upstream = await fetch('https://' + host + imagePath, {
      headers: { Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8', 'User-Agent': 'RoHub-MangaDex-Image-Proxy/1.2', Referer: 'https://mangadex.org/' },
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
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const length = upstream.headers.get('content-length');
    if (length && /^\d+$/.test(length)) res.setHeader('Content-Length', length);
    const { Readable } = require('stream');
    if (upstream.body && typeof Readable.fromWeb === 'function') {
      res.status(200);
      await new Promise((resolve, reject) => {
        const stream = Readable.fromWeb(upstream.body);
        const fail = error => reject(error);
        stream.on('error', fail);
        res.on('error', fail);
        res.on('finish', resolve);
        stream.pipe(res);
      });
      return;
    }
    return res.status(200).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    if (res.headersSent) return;
    if (error && error.name === 'AbortError') return sendError(res, 504, 'UPSTREAM_TIMEOUT', 'MangaDex image request timed out');
    return sendError(res, 502, 'UPSTREAM_NETWORK_ERROR', 'Could not reach MangaDex image server');
  } finally { clearTimeout(timer); }
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
  let incoming;
  try { incoming = new URL(req.url, 'https://rohub.invalid'); }
  catch (_) { return sendError(res, 400, 'INVALID_URL', 'Invalid request URL'); }
  const imageQuery = incoming.searchParams.get('img') || '';
  const legacyPath = incoming.searchParams.get('path') || '';
  const imageRoute = incoming.pathname.endsWith('/image') || (parts.length === 1 && parts[0] === 'image') || /^\/(?:data|data-saver|covers)\//.test(legacyPath) || imageQuery.startsWith('/');
  if (imageRoute) return serveMangaDexImage(req, res, incoming);
  if (!endpointAllowed(parts)) {
    return sendError(res, 400, 'ENDPOINT_NOT_ALLOWED', 'MangaDex endpoint or identifier is not allowed');
  }

  const params = new URLSearchParams();
  incoming.searchParams.forEach((value, key) => {
    // Vercel catch-all routing may inject __path into the incoming query.
    // It is routing metadata, not a MangaDex API parameter; forwarding it causes
    // MangaDex validation_exception: property __path is not defined.
    // Strip internal routing metadata regardless of exact spelling/casing.
    if (key !== 'path' && key !== '_rf' && !key.startsWith('__')) params.append(key, value);
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
module.exports._test = { endpointAllowed, UUID, TIMEOUT_MS, allowedImageHost, resolveImagePath };
