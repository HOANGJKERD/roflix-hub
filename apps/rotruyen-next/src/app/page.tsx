import Link from "next/link";
import { CatalogBrowser } from "@/app/catalog/catalog-browser";

export default function HomePage() {
  return <main className="shell">
    <header className="topbar"><Link className="brand" href="/"><span className="brandMark">R</span><span>Ro<span className="accent">Truyện</span><small>BY ROHUB · NEXT</small></span></Link><span className="status">BẢN CHUYỂN ĐỔI ĐỘC LẬP</span></header>
    <section className="hero"><p className="eyebrow">ONE HUB. MANY WORLDS.</p><h1>Mở trang sách.<br/><span>Mở một thế giới.</span></h1><p className="intro">RoTruyện đang được chuyển sang Next.js, React và TypeScript theo từng bước. Phiên bản này đã bắt đầu dùng catalog thật từ MangaDex, tách biệt với website hiện tại.</p><div className="actions"><a className="primary" href="#catalog">Khám phá thư viện ↓</a><a className="secondary" href="https://github.com/HOANGJKERD/RoTruyen-" target="_blank" rel="noreferrer">Tham khảo RoTruyen- ↗</a></div></section>
    <CatalogBrowser />
    <footer>RoTruyện · RoHub <span>Next.js + React + TypeScript</span></footer>
  </main>;
}
