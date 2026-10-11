"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  chapterId: string;
  mangaId: string | null;
  chapterNumber: string | null;
  chapterTitle: string;
  volume: string | null;
  pages: string[];
  language: string;
  previousId: string | null;
  nextId: string | null;
};

const LANGUAGES = [
  ["vi", "Tiếng Việt"], ["en", "English"], ["ja", "日本語"], ["ko", "한국어"],
  ["zh", "中文"], ["pt-br", "Português (Brasil)"], ["es", "Español"], ["id", "Bahasa Indonesia"],
];

export function ReaderExperience(props: Props) {
  const { chapterId, mangaId, chapterNumber, chapterTitle, volume, pages, language, previousId, nextId } = props;
  const [failed, setFailed] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [switching, setSwitching] = useState(false);
  const [languageError, setLanguageError] = useState("");
  const restored = useRef(false);
  const progressKey = `rotruyen:reader-progress:${mangaId || "unknown"}:${chapterId}`;
  const latestKey = `rotruyen:reader-latest:${mangaId || "unknown"}`;

  const updateProgress = useCallback(() => {
    const root = document.documentElement;
    const max = root.scrollHeight - window.innerHeight;
    const next = max > 0 ? Math.min(100, Math.max(0, Math.round((window.scrollY / max) * 100))) : 100;
    setProgress(next);
    try {
      const saved = JSON.stringify({ chapterId, percent: next, updatedAt: Date.now() });
      localStorage.setItem(progressKey, saved);
      localStorage.setItem(latestKey, saved);
    } catch { /* Storage can be disabled by the browser. */ }
  }, [chapterId, latestKey, progressKey]);

  useEffect(() => {
    setFailed([]);
    setProgress(0);
    restored.current = false;
    try {
      const saved = localStorage.getItem(progressKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { chapterId?: string; percent?: number };
        if (parsed.chapterId === chapterId && typeof parsed.percent === "number") {
          requestAnimationFrame(() => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo({ top: Math.max(0, max * Math.min(100, Math.max(0, parsed.percent!)) / 100), behavior: "auto" });
            restored.current = true;
            setProgress(Math.round(parsed.percent!));
          });
        }
      }
    } catch { /* Ignore invalid or unavailable local progress. */ }

    let frame = 0;
    const onScroll = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateProgress);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [chapterId, progressKey, updateProgress]);

  async function switchLanguage(nextLanguage: string) {
    if (!mangaId || nextLanguage === language) return;
    setSwitching(true);
    setLanguageError("");
    try {
      const params = new URLSearchParams({ language: nextLanguage, limit: "100", offset: "0" });
      const response = await fetch(`/api/manga/${encodeURIComponent(mangaId)}/chapters?${params}`);
      const payload = await response.json() as { items?: Array<{ id: string; chapter: string | null; volume: string | null }>; message?: string };
      if (!response.ok) throw new Error(payload.message || "Không tải được chương theo ngôn ngữ đã chọn.");
      const items = payload.items || [];
      const matching = items.find((item) => item.chapter === chapterNumber && item.volume === volume) ||
        items.find((item) => item.chapter === chapterNumber) || items[0];
      if (!matching) throw new Error("Không tìm thấy chương tương ứng ở ngôn ngữ này.");
      window.location.assign(`/read/${encodeURIComponent(matching.id)}`);
    } catch (error) {
      setLanguageError(error instanceof Error ? error.message : "Đổi ngôn ngữ thất bại.");
      setSwitching(false);
    }
  }

  const label = chapterNumber ? `Chương ${chapterNumber}` : "Chương ngoại truyện";
  return <>
    <div className="readerProgressTrack" aria-hidden="true"><div className="readerProgressFill" style={{ width: `${progress}%` }}/></div>
    <header className="readerTopbar">
      <Link className="secondary" href={mangaId ? `/manga/${encodeURIComponent(mangaId)}` : "/"}>← Danh sách chương</Link>
      <div><strong>{label}</strong><p>{chapterTitle || "Không có tiêu đề"} · {pages.length} trang</p></div>
      <div className="readerTools">
        <label className="languageSelect"><span className="srOnly">Ngôn ngữ chương</span><select aria-label="Ngôn ngữ chương" value={language} disabled={switching} onChange={(event) => void switchLanguage(event.target.value)}>{LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
        <a className="secondary sourceLink" href={`https://mangadex.org/chapter/${encodeURIComponent(chapterId)}`} target="_blank" rel="noreferrer">Nguồn ↗</a>
      </div>
    </header>
    {switching && <div className="readerToast" role="status">Đang tìm chương tương ứng…</div>}
    {languageError && <div className="notice error readerLanguageError" role="alert">{languageError}</div>}
    <div className="readerNav">
      {previousId ? <Link className="secondary" href={`/read/${encodeURIComponent(previousId)}`}>← Chương trước</Link> : <button className="secondary" disabled>← Chương trước</button>}
      <span>{progress}% đã đọc</span>
      {nextId ? <Link className="primary" href={`/read/${encodeURIComponent(nextId)}`}>Chương tiếp →</Link> : <button className="primary" disabled>Chương tiếp →</button>}
    </div>
    <section className="readerPages" aria-label="Các trang truyện">
      {pages.map((src, index) => <figure className="readerPage" key={src}>
        {failed.includes(index) ? <div className="readerImageError" role="alert"><strong>Không tải được trang {index + 1}</strong><p>Ảnh có thể tạm thời không khả dụng.</p><button className="secondary" type="button" onClick={() => { setFailed((current) => current.filter((n) => n !== index)); const img = document.getElementById(`reader-image-${index}`) as HTMLImageElement | null; if (img) img.src = src; }}>Thử tải lại</button></div> : <img id={`reader-image-${index}`} src={src} alt={`Trang ${index + 1}`} loading={index < 2 ? "eager" : "lazy"} onError={() => setFailed((current) => current.includes(index) ? current : [...current, index])}/>}
        <figcaption>Trang {index + 1} / {pages.length}</figcaption>
      </figure>)}
    </section>
    <div className="readerEnd"><p>Đã đến cuối chương.</p><div className="readerNav readerNavEnd">
      {previousId ? <Link className="secondary" href={`/read/${encodeURIComponent(previousId)}`}>← Chương trước</Link> : <span/>}
      {nextId ? <Link className="primary" href={`/read/${encodeURIComponent(nextId)}`}>Chương tiếp →</Link> : <Link className="secondary" href={mangaId ? `/manga/${encodeURIComponent(mangaId)}` : "/"}>Danh sách chương</Link>}
    </div></div>
  </>;
}
