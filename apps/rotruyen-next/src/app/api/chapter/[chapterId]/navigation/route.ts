import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ChapterRow = { id: string; attributes: { chapter?: string | null; volume?: string | null; translatedLanguage?: string } };

export async function GET(request: NextRequest, context: { params: { chapterId: string } }) {
  const id = context.params.chapterId;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ message: "Mã chương không hợp lệ." }, { status: 400 });
  const language = (request.nextUrl.searchParams.get("language") || "vi").slice(0, 5);
  try {
    const currentResponse = await fetch(`https://api.mangadex.org/chapter/${encodeURIComponent(id)}`, { next: { revalidate: 60 } });
    if (!currentResponse.ok) return NextResponse.json({ message: "Không tìm thấy chương." }, { status: currentResponse.status === 404 ? 404 : 502 });
    const currentPayload = await currentResponse.json() as { data?: { id: string; attributes: { chapter?: string | null; volume?: string | null; translatedLanguage?: string }; relationships?: Array<{ id: string; type: string }> } };
    const current = currentPayload.data;
    const mangaId = current?.relationships?.find((item) => item.type === "manga")?.id;
    if (!current || !mangaId) return NextResponse.json({ previousId: null, nextId: null, mangaId: null });
    const params = new URLSearchParams({ limit: "500", offset: "0", "order[chapter]": "asc", "order[volume]": "asc" });
    params.append("translatedLanguage[]", language);
    params.append("contentRating[]", "safe");
    params.append("contentRating[]", "suggestive");
    const feedResponse = await fetch(`https://api.mangadex.org/manga/${encodeURIComponent(mangaId)}/feed?${params}`, { next: { revalidate: 60 } });
    if (!feedResponse.ok) throw new Error("Feed unavailable");
    const feed = await feedResponse.json() as { data?: ChapterRow[] };
    const rows = feed.data || [];
    let index = rows.findIndex((item) => item.id === id);
    if (index < 0 && current.attributes.chapter) {
      index = rows.findIndex((item) => item.attributes.chapter === current.attributes.chapter && item.attributes.volume === current.attributes.volume);
    }
    return NextResponse.json({
      mangaId,
      previousId: index > 0 ? rows[index - 1].id : null,
      nextId: index >= 0 && index < rows.length - 1 ? rows[index + 1].id : null,
      currentLanguage: current.attributes.translatedLanguage || language,
    }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180" } });
  } catch {
    return NextResponse.json({ message: "Không thể xác định chương liền trước/sau." }, { status: 502 });
  }
}
