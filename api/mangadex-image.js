// Safe image proxy for MangaDex cover art and @Home chapter pages.
const ALLOWED_HOST = /^(uploads\.mangadex\.org|[a-z0-9-]+\.mangadex\.network)$/i;
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end('Method not allowed');
  const incoming = new URL(req.url, 'https://rohub.invalid');
  const host = incoming.searchParams.get('host') || 'uploads.mangadex.org';
  const path = incoming.searchParams.get('path') || '';
  if (!ALLOWED_HOST.test(host) || !path.startsWith('/') || path.startsWith('//') || path.includes('..')) {
    return res.status(400).json({ error: 'Invalid MangaDex image URL' });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const upstream = await fetch('https://' + host + path, {
      headers: { 'User-Agent': 'RoHub-Image-Proxy/1.0', Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' },
      signal: controller.signal
    });
    if (!upstream.ok) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(upstream.status).json({ error: 'Image source returned HTTP ' + upstream.status });
    }
    const type = upstream.headers.get('content-type') || 'application/octet-stream';
    if (!type.toLowerCase().startsWith('image/')) return res.status(502).json({ error: 'Source did not return an image' });
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) {
    return res.status(e && e.name === 'AbortError' ? 504 : 502).json({ error: 'Could not fetch MangaDex image' });
  } finally { clearTimeout(timer); }
};
