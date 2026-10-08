// Vercel serverless proxy for AniMapper.
// Keeps the AniMapper API call server-side so browser CORS cannot block ROFLIX.
// Only the public AniMapper v1 endpoints used by ROFLIX are allowed.

const ORIGIN = 'https://api.animapper.net/api/v1';
const ALLOWED = new Set([
  '/search',
  '/metadata',
  '/stream/episodes',
  '/stream/episodes/servers',
  '/stream/source'
]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const rawPath = String(req.query?.path || '');
  let path;
  try {
    path = decodeURIComponent(rawPath);
  } catch (_) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  if (!ALLOWED.has(path)) {
    return res.status(400).json({ error: 'AniMapper endpoint not allowed' });
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === 'path') continue;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (v != null) params.append(key, String(v));
    }
  }

  const target = ORIGIN + path + (params.toString() ? '?' + params.toString() : '');

  try {
    const upstream = await fetch(target, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'RoFlix-AniMapper/1.0'
      },
      cache: 'no-store'
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    return res.send(text);
  } catch (error) {
    return res.status(502).json({
      error: 'AniMapper upstream unavailable',
      detail: String(error?.message || error)
    });
  }
}
