import { NextRequest, NextResponse } from "next/server";
import { mapMangaDexItem, type MangaDexManga } from "@/lib/mangadex";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  const id = context.params.id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ message: "Mã truyện không hợp lệ." }, { status: 400 });
  }

  try {
    const url = new URL(`https://api.mangadex.org/manga/${encodeURIComponent(id)}`);
    url.searchParams.append("includes[]", "cover_art");
    url.searchParams.append("includes[]", "author");
    url.searchParams.append("includes[]", "artist");
    const response = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 120 } });
    if (response.status === 404) return NextResponse.json({ message: "Không tìm thấy truyện." }, { status: 404 });
    if (!response.ok) throw new Error(`MangaDex HTTP ${response.status}`);
    const payload = await response.json() as { data?: MangaDexManga };
    if (!payload.data) return NextResponse.json({ message: "Nguồn không trả về dữ liệu truyện." }, { status: 502 });
    const item = mapMangaDexItem(payload.data);
    const attributes = payload.data.attributes;
    const artist = payload.data.relationships?.find((r) => r.type === "artist")?.attributes?.name || "";
    return NextResponse.json({
      ...item,
      artist,
      originalTitle: attributes.title || {},
      descriptionByLanguage: attributes.description || {},
      publicationDemographic: (attributes as { publicationDemographic?: string | null }).publicationDemographic || null,
    }, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ message: "Không thể tải chi tiết từ MangaDex lúc này." }, { status: 502 });
  }
}
