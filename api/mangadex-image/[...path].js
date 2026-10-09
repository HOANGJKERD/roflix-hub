// Image relay for public MangaDex chapter pages.
// Restrict requests to MangaDex upload paths; never accept arbitrary hostnames.
module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  const incoming = new URL(req.url || "/", "https://roflix.local");
  const marker = "/api/mangadex-image/";
  const i = incoming.pathname.indexOf(marker);
  if (i < 0) return res.status(404).end();
  const imagePath = "/" + incoming.pathname.slice(i + marker.length);
  if (!/^\/data(-saver)?\/[a-f0-9]+\/[A-Za-z0-9._-]+$/.test(imagePath)) {
    return res.status(404).end();
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const upstream = await fetch("https://uploads.mangadex.org" + imagePath, {
      headers: { "User-Agent": "RoFlixHub-RoTruyen/1.0" },
      signal: controller.signal
    });
    if (!upstream.ok) return res.status(upstream.status).end();
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(error && error.name === "AbortError" ? 504 : 502).end();
  } finally {
    clearTimeout(timeout);
  }
};
