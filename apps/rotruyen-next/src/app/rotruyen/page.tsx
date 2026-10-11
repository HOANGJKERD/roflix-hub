import Link from "next/link";
import { CatalogBrowser } from "@/app/catalog/catalog-browser";

export default function RoTruyenPage() {
  return <main className="shell">
    <header className="topbar">
      <Link className="brand" href="/"><span className="brandMark">R</span><span>Ro<span className="accent">Hub</span><small>ONE HUB. MANY WORLDS.</small></span></Link>
      <Link className="secondary" href="/">← Về RoHub</Link>
    </header>
    <section className="hero">
      <p className="eyebrow">ROTRUYỆN · NEXT.JS + REACT + TYPESCRIPT</p>
      <h1>Mở trang sách.<br/><span>Mở một thế giới.</span></h1>
      <p className="intro">Khám phá thư viện truyện, tìm kiếm tác phẩm và tiếp tục hành trình đọc. RoTruyện mới là nền tảng truyện trong hệ sinh thái RoHub.</p>
      <div className="actions"><a className="primary" href="#catalog">Khám phá thư viện ↓</a><a className="secondary" href="https://github.com/HOANGJKERD/RoTruyen-" target="_blank" rel="noreferrer">Tham khảo dự án cũ ↗</a></div>
    </section>
    <CatalogBrowser />
    <footer><Link href="/">RoHub</Link><span>RoTruyện · Next.js + React + TypeScript</span></footer>
  </main>;
}
