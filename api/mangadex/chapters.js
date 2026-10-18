// Read-only MangaDex chapter feed proxy for RoHub admin import.
const ORIGIN = 'https://api.mangadex.org';
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Only GET is supported' });
  const incoming = new URL(req.url, 'https://rohub.invalid');
  const manga = incoming.searchParams.get('manga') || '';
  if (!/^[0-9a-f-]{36}$/i.test(manga)) return res.status(400).json({ error: 'Invalid MangaDex manga UUID' });
  const params = new URLSearchParams();
  params.set('manga', manga);
  params.set('limit', '500');
  params.set('order[chapter]', 'asc');
  params.append('translatedLanguage[]', 'vi');
  params.append('includes[]', 'scanlation_group');
  params.set('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');
  params.append('contentRating[]', 'erotica');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const upstream = await fetch(ORIGIN + '/chapter?' + params.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'RoHub-MangaDex-Proxy/1.0' },
      signal: controller.signal
    });
    const body = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', upstream.ok ? 'public, s-maxage=60, stale-while-revalidate=120' : 'no-store');
    return res.status(upstream.status).send(body);
  } catch (error) {
    return res.status(error && error.name === 'AbortError' ? 504 : 502).json({ error: error && error.name === 'AbortError' ? 'MangaDex chapter request timed out' : 'Could not reach MangaDex API' });
  } finally { clearTimeout(timer); }
};
