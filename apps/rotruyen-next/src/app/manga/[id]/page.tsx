import Link from "next/link";
import { notFound } from "next/navigation";
import { mapMangaDexItem, type MangaDexManga } from "@/lib/mangadex";

type Detail = ReturnType<typeof mapMangaDexItem> & { artist: string };
type Chapter = { id: string; volume: string | null; chapter: string | null; title: string; pages: number; group: string; publishAt: string | null };
type Feed = { items: Chapter[]; total: number };

async function getStory(id: string): Promise<Detail | null> {
  try {
    const url = new URL(`https://api.mangadex.org/manga/${encodeURIComponent(id)}`);
    ["cover_art", "author", "artist"].forEach((type) => url.searchParams.append("includes[]", type));
    const response = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 120 } });
    if (!response.ok) return null;
    const payload = await response.json() as { data?: MangaDexManga };
    if (!payload.data) return null;
    const item = mapMangaDexItem(payload.data);
    return { ...item, artist: payload.data.relationships?.find((r) => r.type === "artist")?.attributes?.name || "" };
  } catch { return null; }
}

async function getChapters(id: string): Promise<Feed | null> {
  try {
    const url = new URL(`https://api.mangadex.org/manga/${encodeURIComponent(id)}/feed`);
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", "0");
    url.searchParams.set("order[chapter]", "asc");
    url.searchParams.set("order[volume]", "asc");
    url.searchParams.append("translatedLanguage[]", "vi");
    url.searchParams.append("contentRating[]", "safe");
    url.searchParams.append("contentRating[]", "suggestive");
    url.searchParams.append("includes[]", "scanlation_group");
    const response = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 60 } });
    if (!response.ok) return null;
    const payload = await response.json() as { data?: Array<{ id: string; attributes: { volume?: string | null; chapter?: string | null; title?: string | null; pages?: number; publishAt?: string }; relationships?: Array<{ id: string; type: string; attributes?: { name?: string } }> }>; total?: number };
    return {
      items: (payload.data || []).map((chapter) => ({
        id: chapter.id, volume: chapter.attributes.volume || null, chapter: chapter.attributes.chapter || null,
        title: chapter.attributes.title || "", pages: chapter.attributes.pages || 0,
        group: chapter.relationships?.find((r) => r.type === "scanlation_group")?.attributes?.name || "Nhóm dịch chưa rõ",
        publishAt: chapter.attributes.publishAt || null,
      })),
      total: payload.total || 0,
    };
  } catch { return null; }
}

export default async function MangaDetailPage({ params }: { params: { id: string } }) {
  const [story, feed] = await Promise.all([getStory(params.id), getChapters(params.id)]);
  if (!story) notFound();
  const statusLabels: Record<string, string> = { ongoing: "Đang phát hành", completed: "Đã hoàn thành", hiatus: "Tạm ngưng", cancelled: "Đã hủy" };
  const ratingLabels: Record<string, string> = { safe: "Phù hợp mọi lứa tuổi", suggestive: "Có nội dung gợi ý" };

  return <main className="shell">
    <header className="topbar"><Link className="brand" href="/"><span className="brandMark">R</span><span>Ro<span className="accent">Truyện</span><small>BY ROHUB · NEXT</small></span></Link><Link className="secondary" href="/">← Thư viện</Link></header>
    <section className="detailHero">
      <div className="detailCover">{story.coverUrl ? <img src={story.coverUrl} alt={`Bìa ${story.title}`} /> : <span className="noCover">ROTRUYỆN</span>}</div>
      <div className="detailCopy">
        <p className="eyebrow">THÔNG TIN TRUYỆN · MANG ADEX</p>
        <h1>{story.title}</h1>
        <p className="muted">Tác giả: {story.author}{story.artist ? ` · Họa sĩ: ${story.artist}` : ""}</p>
        <div className="detailBadges"><span>{statusLabels[story.status] || "Đang cập nhật"}</span><span>{ratingLabels[story.contentRating] || "Phân loại chưa rõ"}</span>{story.year && <span>{story.year}</span>}</div>
        <div className="tags detailTags">{story.tags.join(" · ") || "Chưa phân loại thể loại"}</div>
        <h2>Giới thiệu</h2><p className="description">{story.description}</p>
        <a className="primary" href={`https://mangadex.org/title/${encodeURIComponent(story.id)}`} target="_blank" rel="noreferrer">Mở trang nguồn ↗</a>
      </div>
    </section>
    <section className="chapterSection">
      <div className="sectionHeading"><div><p className="eyebrow">READING LIST</p><h2>Danh sách chương</h2></div><span className="count">{feed ? `${feed.total.toLocaleString("vi-VN")} chương ở nguồn` : "Nguồn chương tạm thời không khả dụng"}</span></div>
      {!feed && <div className="notice error">Không tải được danh sách chương. Bạn có thể thử lại sau hoặc mở trang MangaDex.</div>}
      {feed && feed.items.length === 0 && <div className="notice">Chưa tìm thấy chương dịch tiếng Việt cho truyện này. Danh sách chương có thể thay đổi theo nhóm dịch và ngôn ngữ.</div>}
      {feed && feed.items.length > 0 && <div className="chapterList">{feed.items.map((chapter) => <article className="chapterRow" key={chapter.id}>
        <div><strong>{chapter.chapter ? `Chương ${chapter.chapter}` : "Chương ngoại truyện"}{chapter.volume ? ` · Tập ${chapter.volume}` : ""}</strong><p>{chapter.title || "Không có tiêu đề"} · {chapter.pages} trang</p><small>{chapter.group}</small></div>
        <a className="secondary" href={`https://mangadex.org/chapter/${encodeURIComponent(chapter.id)}`} target="_blank" rel="noreferrer">Đọc ở nguồn ↗</a>
      </article>)}</div>}
      <p className="sourceNote">Danh sách lấy từ MangaDex. Ở giai đoạn này, nút đọc mở trình đọc của nguồn; trình đọc nội bộ sẽ được bổ sung tiếp theo.</p>
    </section>
    <footer>RoTruyện · RoHub <span>Thông tin truyện từ MangaDex</span></footer>
  </main>;
}
