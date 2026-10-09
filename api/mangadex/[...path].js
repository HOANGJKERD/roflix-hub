// Same-origin, read-only proxy for MangaDex API paths used by RoTruyen.
// Vercel catch-all route: /api/mangadex/<path>
module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const incoming = new URL(req.url || "/", "https://roflix.local");
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

  // Vercel may add ___path for catch-all routing. Never forward it upstream.
  incoming.searchParams.delete("___path");
  const query = incoming.searchParams.toString();
  const querySuffix = query ? "?" + query : "";
  const apiUrl = "https://api.mangadex.org" + apiPath + querySuffix;
  const encoded = Buffer.from(apiUrl).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    let upstream;
    let lastError;
    // TruyenDex's public source documents this relay URL pattern.
    const attempts = [
      "https://services.f-ck.me/v1/cors/" + encoded,
      apiUrl,
      "https://api.mangadex.dev" + apiPath + querySuffix
    ];
    for (const url of attempts) {
      try {
        upstream = await fetch(url, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "User-Agent": "RoFlixHub-RoTruyen/1.0",
            "x-requested-with": "cubari"
          },
          signal: controller.signal
        });
        if (upstream.ok || upstream.status < 500) break;
      } catch (error) {
        lastError = error;
        if (controller.signal.aborted) throw error;
      }
    }
    if (!upstream) throw lastError || new Error("No MangaDex upstream available");
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
