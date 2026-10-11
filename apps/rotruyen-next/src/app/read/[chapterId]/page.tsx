import Link from "next/link";
import { notFound } from "next/navigation";
import { ReaderExperience } from "./reader-experience";

type ChapterInfo = {
  id: string;
  attributes?: { chapter?: string | null; title?: string | null; volume?: string | null; pages?: number; translatedLanguage?: string };
  relationships?: Array<{ id: string; type: string }>;
};
type AtHome = { baseUrl: string; chapter: { hash: string; data: string[]; dataSaver: string[] } };
type ChapterRow = { id: string; attributes: { chapter?: string | null; volume?: string | null } };

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
    const mangaId = chapter.relationships?.find((relationship) => relationship.type === "manga")?.id || null;
    const language = chapter.attributes?.translatedLanguage || "vi";
    let previousId: string | null = null;
    let nextId: string | null = null;
    if (mangaId) {
      try {
        const params = new URLSearchParams({ limit: "500", offset: "0", "order[chapter]": "asc", "order[volume]": "asc" });
        params.append("translatedLanguage[]", language);
        params.append("contentRating[]", "safe");
        params.append("contentRating[]", "suggestive");
        const feedResponse = await fetch(`https://api.mangadex.org/manga/${encodeURIComponent(mangaId)}/feed?${params}`, { next: { revalidate: 60 } });
        if (feedResponse.ok) {
          const feed = await feedResponse.json() as { data?: ChapterRow[] };
          const rows = feed.data || [];
          let index = rows.findIndex((item) => item.id === id);
          if (index < 0 && chapter.attributes?.chapter) {
            index = rows.findIndex((item) => item.attributes.chapter === chapter.attributes?.chapter && item.attributes.volume === chapter.attributes?.volume);
          }
          if (index > 0) previousId = rows[index - 1].id;
          if (index >= 0 && index < rows.length - 1) nextId = rows[index + 1].id;
        }
      } catch { /* Reading still works if adjacent-chapter lookup fails. */ }
    }
    return {
      chapter,
      mangaId,
      language,
      previousId,
      nextId,
      pages: images.chapter.data.map((filename) => `${images.baseUrl}/data/${images.chapter.hash}/${encodeURIComponent(filename)}`),
    };
  } catch { return null; }
}

export default async function ChapterReaderPage({ params }: { params: { chapterId: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.chapterId)) notFound();
  const data = await getReaderData(params.chapterId);
  if (!data) {
    return <main className="shell readerShell"><header className="topbar"><Link className="brand" href="/rotruyen"><span className="brandMark">R</span><span>Ro<span className="accent">Truyện</span><small>BY ROHUB · READER</small></span></Link></header><div className="notice error">Không tải được chương hoặc dữ liệu ảnh từ MangaDex. Chương có thể không khả dụng hoặc nguồn đang gặp sự cố.</div><Link className="secondary" href="/rotruyen">← Về thư viện</Link></main>;
  }
  const chapter = data.chapter.attributes || {};
  return <main className="shell readerShell">
    <header className="topbar"><Link className="brand" href={data.mangaId ? `/manga/${encodeURIComponent(data.mangaId)}` : "/rotruyen"}><span className="brandMark">R</span><span>Ro<span className="accent">Truyện</span><small>BY ROHUB · READER</small></span></Link><span className="status">ĐANG ĐỌC</span></header>
    <ReaderExperience chapterId={params.chapterId} mangaId={data.mangaId} chapterNumber={chapter.chapter || null} chapterTitle={chapter.title || ""} volume={chapter.volume || null} pages={data.pages} language={data.language} previousId={data.previousId} nextId={data.nextId}/>
    <footer>RoTruyện · Ảnh chương được cung cấp bởi MangaDex At-Home.</footer>
  </main>;
}
