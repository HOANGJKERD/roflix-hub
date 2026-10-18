// Read-only MangaDex @Home manifest proxy. Returns the official image-server manifest.
const ORIGIN = 'https://api.mangadex.org';
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Only GET is supported' });
  const incoming = new URL(req.url, 'https://rohub.invalid');
  const chapter = incoming.searchParams.get('chapter') || '';
  if (!/^[0-9a-f-]{36}$/i.test(chapter)) return res.status(400).json({ error: 'Invalid MangaDex chapter UUID' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const upstream = await fetch(ORIGIN + '/at-home/server/' + encodeURIComponent(chapter), {
      headers: { Accept: 'application/json', 'User-Agent': 'RoHub-MangaDex-Proxy/1.0' },
      signal: controller.signal
    });
    const body = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', upstream.ok ? 'public, s-maxage=300, stale-while-revalidate=600' : 'no-store');
    return res.status(upstream.status).send(body);
  } catch (error) {
    return res.status(error && error.name === 'AbortError' ? 504 : 502).json({ error: error && error.name === 'AbortError' ? 'MangaDex @Home request timed out' : 'Could not reach MangaDex API' });
  } finally { clearTimeout(timer); }
};
