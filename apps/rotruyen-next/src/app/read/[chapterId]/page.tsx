import Link from "next/link";
import { notFound } from "next/navigation";

type ChapterInfo = {
  id: string;
  attributes?: { chapter?: string | null; title?: string | null; volume?: string | null; pages?: number; translatedLanguage?: string };
  relationships?: Array<{ id: string; type: string }>;
};
type AtHome = { baseUrl: string; chapter: { hash: string; data: string[]; dataSaver: string[] } };

async function getReaderData(id: string) {
  try {
    const [chapterResponse, imagesResponse] = await Promise.all([
      fetch(`https://api.mangadex.org/chapter/${encodeURIComponent(id)}`, { next: { revalidate: 60 } }),
      fetch(`https://api.mangadex.org/at-home/server/${encodeURIComponent(id)}`, { next: { revalidate: 30 } }),
    ]);
    if (!chapterResponse.ok || !imagesResponse.ok) return null;
    const chapterPayload = await chapterResponse.json() as { data?: ChapterInfo };
    const images = await imagesResponse.json() as AtHome;
    if (!chapterPayload.data || !images.baseUrl || !images.chapter?.hash || !images.chapter.data?.length) return null;
    const chapter = chapterPayload.data;
    const mangaId = chapter.relationships?.find((relationship) => relationship.type === "manga")?.id;
    return {
      chapter,
      mangaId,
      pages: images.chapter.data.map((filename) => `${images.baseUrl}/data/${images.chapter.hash}/${encodeURIComponent(filename)}`),
    };
  } catch { return null; }
}

export default async function ChapterReaderPage({ params }: { params: { chapterId: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.chapterId)) notFound();
  const data = await getReaderData(params.chapterId);
  if (!data) {
    return <main className="shell readerShell"><header className="topbar"><Link className="brand" href="/"><span className="brandMark">R</span><span>Ro<span className="accent">Truyện</span><small>BY ROHUB · READER</small></span></Link></header><div className="notice error">Không tải được trang đọc từ MangaDex. Chương có thể không khả dụng hoặc nguồn đang gặp sự cố.</div><Link className="secondary" href="/">← Về thư viện</Link></main>;
  }
  const chapter = data.chapter.attributes || {};
  const label = chapter.chapter ? `Chương ${chapter.chapter}` : "Chương ngoại truyện";
  return <main className="shell readerShell">
    <header className="readerTopbar"><Link className="secondary" href={data.mangaId ? `/manga/${encodeURIComponent(data.mangaId)}` : "/"}>← Danh sách chương</Link><div><strong>{label}</strong><p>{chapter.title || "Không có tiêu đề"} · {chapter.pages || data.pages.length} trang</p></div><a className="secondary" href={`https://mangadex.org/chapter/${encodeURIComponent(params.chapterId)}`} target="_blank" rel="noreferrer">Nguồn ↗</a></header>
    <section className="readerPages" aria-label="Các trang truyện">
      {data.pages.map((src, index) => <figure className="readerPage" key={src}><img src={src} alt={`Trang ${index + 1}`} loading={index < 2 ? "eager" : "lazy"}/><figcaption>Trang {index + 1} / {data.pages.length}</figcaption></figure>)}
    </section>
    <div className="readerEnd"><p>Đã đến cuối chương.</p><Link className="primary" href={data.mangaId ? `/manga/${encodeURIComponent(data.mangaId)}` : "/"}>Trở lại danh sách chương</Link></div>
    <footer>RoTruyện · Nội dung trang đọc được phục vụ bởi MangaDex.</footer>
  </main>;
}
