// Dedicated Vercel serverless proxy for the public NguonC catalog API.
// Kept independent from all anime metadata and playback providers.
const ORIGIN = 'https://phim.nguonc.com/api/';
const PATH_OK = /^(?:films\/(?:phim-moi-cap-nhat|search|danh-sach\/[a-z0-9-]+|the-loai\/[a-z0-9-]+|quoc-gia\/[a-z0-9-]+|nam-phat-hanh\/\d{4}|ngon-ngu\/[a-z0-9-]+)|film\/[a-z0-9-]+)$/;

module.exports = async function nguoncHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const rawPath = String((req.query && req.query.path) || '');
  const path = rawPath.replace(/^\//, '');
  if (!PATH_OK.test(path)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ status: 'error', message: 'Path is not an allowed NguonC catalog route' });
  }

  const params = new URLSearchParams();
  for (const key of ['page', 'keyword']) {
    const value = req.query && req.query[key];
    if (typeof value === 'string' && value.trim()) params.set(key, value.trim().slice(0, 120));
  }
  const target = ORIGIN + path + (params.toString() ? '?' + params.toString() : '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const upstream = await fetch(target, {
      headers: { Accept: 'application/json', 'User-Agent': 'RoFlix-NguonC/1.0' },
      signal: controller.signal
    });
    const body = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', upstream.ok ? 'public, s-maxage=60, stale-while-revalidate=180' : 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(upstream.status).send(body);
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    const status = error && error.name === 'AbortError' ? 504 : 502;
    return res.status(status).json({ status: 'error', message: 'Could not reach NguonC API' });
  } finally {
    clearTimeout(timer);
  }
};

module.exports._test = { PATH_OK, ORIGIN };
