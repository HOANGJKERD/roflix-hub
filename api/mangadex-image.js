// Safe image proxy for MangaDex cover art and @Home chapter pages.
// MangaDex's CDN may reject requests that do not carry a browser-like referrer.
const ALLOWED_HOST = /^(uploads\.mangadex\.org|[a-z0-9-]+\.mangadex\.network)$/i;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method not allowed');
  }

  const incoming = new URL(req.url, 'https://rohub.invalid');
  const host = (incoming.searchParams.get('host') || 'uploads.mangadex.org').toLowerCase();
  const path = incoming.searchParams.get('path') || '';

  // Validate the authority and path independently to prevent open-proxy/SSRF use.
  if (!ALLOWED_HOST.test(host) || !path.startsWith('/') || path.startsWith('//') ||
      path.includes('..') || /[\\\\\r\n]/.test(path)) {
    return res.status(400).json({ error: 'Invalid MangaDex image URL' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const upstream = await fetch('https://' + host + path, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: 'https://mangadex.org/',
        Origin: 'https://mangadex.org',
        'User-Agent': 'Mozilla/5.0 (compatible; RoHubImageProxy/1.1)'
      },
      redirect: 'error',
      signal: controller.signal
    });

    if (!upstream.ok) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-RoHub-Image-Status', 'upstream-' + upstream.status);
      return res.status(upstream.status).json({ error: 'Image source returned HTTP ' + upstream.status });
    }

    const type = upstream.headers.get('content-type') || '';
    if (!type.toLowerCase().startsWith('image/')) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({ error: 'Source did not return an image' });
    }

    const declaredLength = Number(upstream.headers.get('content-length') || 0);
    if (declaredLength > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: 'Image exceeds the proxy size limit' });
    }

    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
      return res.status(bytes.length > MAX_IMAGE_BYTES ? 413 : 502)
        .json({ error: bytes.length > MAX_IMAGE_BYTES ? 'Image exceeds the proxy size limit' : 'Empty image response' });
    }

    res.setHeader('Content-Type', type);
    res.setHeader('Content-Length', String(bytes.length));
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-RoHub-Image-Source', 'mangadex');
    return res.status(200).send(bytes);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    if (e && e.name === 'AbortError') return res.status(504).json({ error: 'Image source timed out' });
    return res.status(502).json({ error: 'Could not fetch MangaDex image' });
  } finally {
    clearTimeout(timer);
  }
};
