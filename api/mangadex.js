// Same-origin, read-only proxy for the public MangaDex API.
// Only allow the endpoints RoTruyen needs; do not forward arbitrary URLs.
module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const incoming = new URL(req.url || "/", "https://roflix.local");
  const prefix = "/api/mangadex";
  if (!incoming.pathname.startsWith(prefix)) {
    return res.status(404).json({ error: "Not found" });
  }
  const apiPath = incoming.pathname.slice(prefix.length) || "/";
  const allowed =
    apiPath === "/manga" ||
    /^\/manga\/[0-9a-f-]+$/.test(apiPath) ||
    /^\/manga\/[0-9a-f-]+\/(feed|aggregate)$/.test(apiPath) ||
    /^\/at-home\/server\/[0-9a-f-]+$/.test(apiPath);

  if (!allowed) return res.status(404).json({ error: "MangaDex endpoint not allowed" });

  const target = "https://api.mangadex.org" + apiPath + incoming.search;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const upstream = await fetch(target, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "RoFlixHub-RoTruyen/1.0 (MangaDex API integration)"
      },
      signal: controller.signal
    });
    const body = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(body);
  } catch (error) {
    const timedOut = error && error.name === "AbortError";
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? "MangaDex upstream timed out" : "MangaDex upstream unavailable"
    });
  } finally {
    clearTimeout(timeout);
  }
};
