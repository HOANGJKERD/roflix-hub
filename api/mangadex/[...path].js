// Same-origin, read-only proxy for MangaDex API paths used by RoTruyen.
// Vercel catch-all route: /api/mangadex/<path>
module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const incoming = new URL(req.url || "/", "https://roflix.local");
  // Vercel rewrites the catch-all route to this function and retains the path.
  const marker = "/api/mangadex/";
  const markerIndex = incoming.pathname.indexOf(marker);
  if (markerIndex < 0) return res.status(404).json({ error: "Not found" });
  const apiPath = "/" + incoming.pathname.slice(markerIndex + marker.length);
  const allowed =
    apiPath === "/manga" ||
    /^\/manga\/[0-9a-f-]+$/.test(apiPath) ||
    /^\/manga\/[0-9a-f-]+\/(feed|aggregate)$/.test(apiPath) ||
    /^\/at-home\/server\/[0-9a-f-]+$/.test(apiPath);

  if (!allowed) return res.status(404).json({ error: "MangaDex endpoint not allowed" });

  // Vercel adds ___path for catch-all routing; never forward this internal parameter upstream.\n  incoming.searchParams.delete("___path");\n  const target = "https://api.mangadex.org" + apiPath + (incoming.searchParams.toString() ? "?" + incoming.searchParams.toString() : "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const upstream = await fetch(target, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "RoFlixHub-RoTruyen/1.0"
      },
      signal: controller.signal
    });
    const body = await upstream.text();
    res.status(upstream.status);
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
