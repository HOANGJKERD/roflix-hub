// Vercel serverless proxy cho AniMapper (JSON). Gọi từ server để tránh CORS và gom cache.
// Dùng CommonJS để chạy được dù repo không có package.json.

const ORIGIN = 'https://api.animapper.net/api/v1';
const ALLOWED = new Set([
  '/search',
  '/metadata',
  '/stream/episodes',
  '/stream/episodes/servers',
  '/stream/source'
]);
// Không chuyển tiếp tham số tự thêm từ client (vd _rf cache-buster).
const DROP_PARAMS = new Set(['path', '_rf']);

function cacheHeader(path) {
  if (path === '/stream/source') return 'public, s-maxage=30, stale-while-revalidate=60';
  return 'public, s-maxage=300, stale-while-revalidate=600';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const rawPath = String((req.query && req.query.path) || '');
  let parsed;
  try { parsed = new URL(rawPath, 'https://x.invalid'); } catch (_) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  const path = parsed.pathname;
  if (!ALLOWED.has(path)) return res.status(400).json({ error: 'AniMapper endpoint not allowed' });

  const params = new URLSearchParams();
  parsed.searchParams.forEach(function (v, k) { if (!DROP_PARAMS.has(k)) params.set(k, v); });
  Object.keys(req.query || {}).forEach(function (k) {
    if (DROP_PARAMS.has(k)) return;
    const v = req.query[k];
    (Array.isArray(v) ? v : [v]).forEach(function (x) { if (x != null) params.set(k, String(x)); });
  });

  const target = ORIGIN + path + (params.toString() ? '?' + params.toString() : '');
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, 20000);

  try {
    const upstream = await fetch(target, {
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': 'RoFlix-AniMapper/1.1' },
      signal: ctrl.signal
    });
    clearTimeout(timer);
    const text = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', upstream.ok ? cacheHeader(path) : 'no-store');
    return res.status(upstream.status).send(text);
  } catch (error) {
    clearTimeout(timer);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({
      error: 'AniMapper upstream unavailable',
      detail: String((error && error.message) || error)
    });
  }
};