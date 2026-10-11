"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { CatalogItem, CatalogResponse } from "@/lib/mangadex";

export function CatalogBrowser() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [genre, setGenre] = useState("all");
  const [sort, setSort] = useState("popular");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 24;
  const visibleItems = items.filter((item) => genre === "all" || item.tags.some((tag) => tag.toLocaleLowerCase("vi").includes(genre)));

  const load = useCallback(async (search: string, nextOffset: number, signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(nextOffset) });
      if (search.trim()) params.set("q", search.trim());
      const response = await fetch(`/api/catalog?${params.toString()}`, { signal, headers: { Accept: "application/json" } });
      const payload = await response.json() as CatalogResponse & { message?: string };
      if (!response.ok) throw new Error(payload.message || "Nguồn truyện hiện chưa phản hồi.");
      setItems(payload.items || []);
      setTotal(payload.total || 0);
      setOffset(nextOffset);
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Đã xảy ra lỗi không xác định.");
      setItems([]);
      setTotal(0);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(submittedQuery, offset, controller.signal);
    return () => controller.abort();
  }, [load, submittedQuery, offset]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOffset(0);
    setSubmittedQuery(query.trim());
  }

  return <section className="catalog" id="catalog">
    <div className="sectionHeading">
      <div><p className="eyebrow">THƯ VIỆN THẬT · MANG ADEX</p><h2>Khám phá truyện</h2><p className="muted">Tìm kiếm trên catalog MangaDex. Nội dung minh họa không được dùng thay cho dữ liệu thật.</p></div>
      <span className="count">{loading ? "Đang tải…" : `${total.toLocaleString("vi-VN")} kết quả nguồn`}</span>
    </div>
    <form className="searchForm" onSubmit={submitSearch}>
      <label className="searchBox"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập tên truyện..." aria-label="Tìm tên truyện" maxLength={120}/></label>
      <button className="primary" type="submit" disabled={loading}>Tìm truyện</button>
      {submittedQuery && <button className="secondary" type="button" onClick={() => { setQuery(""); setSubmittedQuery(""); setOffset(0); }}>Xóa tìm kiếm</button>}
      <label className="selectBox"><span className="srOnly">Lọc thể loại</span><select value={genre} onChange={(event) => setGenre(event.target.value)}><option value="all">Tất cả thể loại</option><option value="action">Hành động</option><option value="romance">Lãng mạn</option><option value="drama">Chính kịch</option><option value="adventure">Phiêu lưu</option><option value="fantasy">Fantasy</option><option value="comedy">Hài hước</option><option value="mystery">Bí ẩn</option><option value="sci-fi">Khoa học viễn tưởng</option></select></label>
      <label className="selectBox"><span className="srOnly">Sắp xếp</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="popular">Phổ biến từ nguồn</option><option value="title">Tên A đến Z</option></select></label>
    </form>
    {error && <div className="notice error" role="alert"><strong>Không tải được catalog.</strong><p>{error}</p><button className="secondary" type="button" onClick={() => void load(submittedQuery, offset)}>Thử lại</button></div>}
    {loading && <div className="notice" role="status">Đang tải dữ liệu thật từ MangaDex…</div>}
    {!loading && !error && visibleItems.length === 0 && <div className="notice">Không tìm thấy truyện phù hợp. Hãy thử từ khóa hoặc thể loại khác.</div>}
    <div className="storyGrid">{[...visibleItems].sort((a, b) => sort === "title" ? a.title.localeCompare(b.title, "vi") : 0).map((item) => <article className="storyCard" key={item.id}>
      <a className="cover" href={`/manga/${encodeURIComponent(item.id)}`} aria-label={`Xem ${item.title}`}>
        {item.coverUrl ? <img src={item.coverUrl} alt={`Bìa ${item.title}`} loading="lazy"/> : <span className="noCover">ROTRUYỆN</span>}
      </a>
      <h3><a href={`/manga/${encodeURIComponent(item.id)}`}>{item.title}</a></h3>
      <p className="muted">{item.author}</p>
      <p className="tags">{item.tags.slice(0, 2).join(" · ") || "Manga"}</p>
    </article>)}</div>
    <nav className="pagination" aria-label="Phân trang catalog">
      <button className="secondary" type="button" disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>← Trang trước</button>
      <span>{visibleItems.length ? `${offset + 1}–${offset + visibleItems.length} / ${total.toLocaleString("vi-VN")}` : "Không có kết quả"}</span>
      <button className="secondary" type="button" disabled={loading || offset + limit >= total || items.length === 0} onClick={() => setOffset(offset + limit)}>Trang sau →</button>
    </nav>
    <p className="sourceNote">Dữ liệu catalog và bìa truyện do MangaDex cung cấp. RoHub không lưu trữ bản scan truyện trong catalog này.</p>
  </section>;
}
