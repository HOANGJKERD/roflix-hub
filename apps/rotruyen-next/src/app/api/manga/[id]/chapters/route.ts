import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Chapter = {
  id: string;
  attributes: {
    volume?: string | null;
    chapter?: string | null;
    title?: string | null;
    translatedLanguage?: string;
    pages?: number;
    publishAt?: string;
    readableAt?: string;
  };
  relationships?: Array<{ id: string; type: string; attributes?: { name?: string } }>;
};

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const id = context.params.id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ message: "Mã truyện không hợp lệ." }, { status: 400 });
  }
  const params = request.nextUrl.searchParams;
  const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 100));
  const offset = Math.max(0, Math.min(10000, Number(params.get("offset")) || 0));
  const language = (params.get("language") || "vi").slice(0, 5);
  const url = new URL("https://api.mangadex.org/manga/" + encodeURIComponent(id) + "/feed");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("order[chapter]", "asc");
  url.searchParams.set("order[volume]", "asc");
  url.searchParams.set("translatedLanguage[]", language);
  url.searchParams.append("contentRating[]", "safe");
  url.searchParams.append("contentRating[]", "suggestive");
  url.searchParams.append("includes[]", "scanlation_group");

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 60 } });
    if (!response.ok) throw new Error(`MangaDex HTTP ${response.status}`);
    const payload = await response.json() as { data?: Chapter[]; total?: number; limit?: number; offset?: number };
    const chapters = (payload.data || []).map((chapter) => ({
      id: chapter.id,
      volume: chapter.attributes.volume || null,
      chapter: chapter.attributes.chapter || null,
      title: chapter.attributes.title || "",
      language: chapter.attributes.translatedLanguage || language,
      pages: chapter.attributes.pages || 0,
      publishAt: chapter.attributes.publishAt || null,
      group: chapter.relationships?.find((r) => r.type === "scanlation_group")?.attributes?.name || "Nhóm dịch chưa rõ",
    }));
    return NextResponse.json({
      items: chapters,
      total: payload.total || 0,
      limit: payload.limit || limit,
      offset: payload.offset || offset,
    }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180" } });
  } catch {
    return NextResponse.json({ message: "Không thể tải danh sách chương từ MangaDex lúc này." }, { status: 502 });
  }
}
