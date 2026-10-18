// Explicit static MangaDex catalogue endpoint.
// Avoids Vercel catch-all routing metadata (such as __path) being forwarded upstream.
const ORIGIN = 'https://api.mangadex.org';
const ALLOWED = new Set([
  'limit', 'offset', 'title', 'order[followedCount]',
  'includes[]', 'contentRating[]', 'availableTranslatedLanguage[]', 'includedTags[]'
]);
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Only GET is supported' });

  const incoming = new URL(req.url, 'https://rohub.invalid');
  const params = new URLSearchParams();
  // Allowlist known catalogue filters. Never forward Vercel/internal query keys.
  incoming.searchParams.forEach((value, key) => {
    if (ALLOWED.has(key)) params.append(key, value);
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const upstream = await fetch(ORIGIN + '/manga?' + params.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'RoHub-MangaDex-Proxy/1.0' },
      signal: controller.signal
    });
    const body = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', upstream.ok ? 'public, s-maxage=120, stale-while-revalidate=300' : 'no-store');
    return res.status(upstream.status).send(body);
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(error && error.name === 'AbortError' ? 504 : 502).json({
      error: error && error.name === 'AbortError' ? 'MangaDex API request timed out' : 'Could not reach MangaDex API'
    });
  } finally {
    clearTimeout(timer);
  }
};
