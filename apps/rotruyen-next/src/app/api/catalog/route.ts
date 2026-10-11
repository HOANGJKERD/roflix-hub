import { NextRequest, NextResponse } from "next/server";
import { mapMangaDexItem, type MangaDexManga } from "@/lib/mangadex";

export const runtime = "nodejs";
const API = "https://api.mangadex.org/manga";
const ALLOWED_RATINGS = ["safe", "suggestive"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") || "").trim().slice(0, 120);
  const limit = Math.min(24, Math.max(1, Number(params.get("limit")) || 24));
  const offset = Math.max(0, Math.min(10000, Number(params.get("offset")) || 0));
  const upstream = new URL(API);
  upstream.searchParams.set("limit", String(limit));
  upstream.searchParams.set("offset", String(offset));
  upstream.searchParams.set("order[followedCount]", "desc");
  upstream.searchParams.append("includes[]", "cover_art");
  upstream.searchParams.append("includes[]", "author");
  for (const rating of ALLOWED_RATINGS) upstream.searchParams.append("contentRating[]", rating);
  upstream.searchParams.append("availableTranslatedLanguage[]", "vi");
  if (query) upstream.searchParams.set("title", query);

  try {
    let response = await fetch(upstream, { headers: { Accept: "application/json" }, next: { revalidate: 120 } });
    if (!response.ok) throw new Error(`MangaDex HTTP ${response.status}`);
    let payload = await response.json() as { data?: MangaDexManga[]; total?: number; limit?: number; offset?: number };

    // If the Vietnamese translation filter returns nothing, retry without it for a useful real catalog.
    if (!(payload.data || []).length && !query && offset === 0) {
      upstream.searchParams.delete("availableTranslatedLanguage[]");
      response = await fetch(upstream, { headers: { Accept: "application/json" }, next: { revalidate: 120 } });
      if (!response.ok) throw new Error(`MangaDex HTTP ${response.status}`);
      payload = await response.json() as typeof payload;
    }

    return NextResponse.json({
      items: (payload.data || []).map(mapMangaDexItem),
      total: payload.total || 0,
      limit: payload.limit || limit,
      offset: payload.offset || offset,
    }, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể kết nối nguồn truyện.";
    return NextResponse.json({ error: "CATALOG_UPSTREAM_ERROR", message }, { status: 502 });
  }
}
