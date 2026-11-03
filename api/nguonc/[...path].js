// Same-origin JSON proxy for the public Nguonc catalog.
// Only list/detail JSON. Does not fetch embeds or video files.
const ORIGIN = 'https://phim.nguonc.com/api/';
const PATH_OK = /^(?:films\/(?:phim-moi-cap-nhat|search|danh-sach\/[a-z0-9-]+|the-loai\/[a-z0-9-]+|quoc-gia\/[a-z0-9-]+|nam-phat-hanh\/\d{4}|ngon-ngu\/[a-z0-9-]+)|film\/[a-z0-9-]+)$/;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ status: 'error', message: 'Only GET is supported' });
  }
  const raw = req.query && req.query.path;
  const parts = (Array.isArray(raw) ? raw : raw ? [String(raw)] : []).map(String);
  const path = parts.join('/');
  if (!PATH_OK.test(path)) {
    return res.status(400).json({ status: 'error', message: 'Path is not an allowed Nguonc catalog route' });
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
      headers: { Accept: 'application/json', 'User-Agent': 'RoFlix-Nguonc/1.0' },
      signal: controller.signal
    });
    const body = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', upstream.ok ? 'public, s-maxage=60, stale-while-revalidate=180' : 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(upstream.status).send(body);
  } catch (error) {
    const status = error && error.name === 'AbortError' ? 504 : 502;
    return res.status(status).json({ status: 'error', message: 'Could not reach Nguonc API' });
  } finally {
    clearTimeout(timer);
  }
};
