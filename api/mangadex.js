// Same-origin serverless proxy for public MangaDex API requests.
const ALLOWED_PATH = /^\/(?:manga(?:\/[^/]+(?:\/feed)?)?|author|at-home\/server|cover)\b/;
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({error:'Method not allowed'}); }
  const raw = typeof req.query.path === 'string' ? req.query.path : '';
  let target;
  try { target = new URL(raw, 'https://api.mangadex.org'); } catch (_) { return res.status(400).json({error:'Invalid MangaDex path'}); }
  if (target.origin !== 'https://api.mangadex.org' || !ALLOWED_PATH.test(target.pathname)) return res.status(400).json({error:'Unsupported MangaDex endpoint'});
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const upstream = await fetch(target.toString(), {signal:controller.signal,headers:{Accept:'application/json','User-Agent':'RoHub/1.0 (RoTruyen catalog)'}});
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    return res.send(body);
  } catch (error) {
    return res.status(error.name === 'AbortError' ? 504 : 502).json({error:'MangaDex upstream unavailable',detail:error.name === 'AbortError' ? 'Upstream timeout' : 'Network request failed'});
  } finally { clearTimeout(timer); }
};
