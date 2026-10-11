import Link from "next/link";

const workstreams = [
  { title: "Khám phá thư viện", detail: "Chuyển danh mục, tìm kiếm, bộ lọc và sắp xếp từ RoTruyện hiện tại." },
  { title: "Đọc truyện", detail: "Tách trang chi tiết, danh sách chương và trình đọc thành các route React." },
  { title: "Tủ truyện cá nhân", detail: "Giữ lịch sử đọc, truyện yêu thích và đồng bộ Supabase sau khi xác minh schema." },
  { title: "Nguồn dữ liệu", detail: "Tái sử dụng adapter MangaDex và các nguồn hiện có, không dựng dữ liệu truyện giả." },
];

export default function HomePage() {
  return <main className="shell">
    <header className="topbar"><Link className="brand" href="/"><span className="brandMark">R</span><span>Ro<span className="accent">Truyện</span><small>BY ROHUB · NEXT</small></span></Link><span className="status">BẢN CHUYỂN ĐỔI ĐỘC LẬP</span></header>
    <section className="hero"><p className="eyebrow">ONE HUB. MANY WORLDS.</p><h1>Mở trang sách.<br/><span>Mở một thế giới.</span></h1><p className="intro">Nền tảng RoTruyện đang được tái cấu trúc sang Next.js, React và TypeScript. Nhánh này tách biệt với bản hiện tại để có thể chuyển tính năng và kiểm thử từng bước.</p><div className="actions"><a className="primary" href="#plan">Xem kế hoạch chuyển đổi ↓</a><a className="secondary" href="https://github.com/HOANGJKERD/RoTruyen-" target="_blank" rel="noreferrer">Tham khảo RoTruyen- ↗</a></div></section>
    <section id="plan" className="plan"><div className="sectionHeading"><p className="eyebrow">MIGRATION TRACK</p><h2>Chuyển dần, không đánh đổi tính năng</h2><p>Đây là bộ khung kỹ thuật ban đầu, chưa thay thế bản RoTruyện đang phục vụ người dùng.</p></div><div className="grid">{workstreams.map((item, index) => <article className="tile" key={item.title}><span className="number">0{index + 1}</span><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div></section>
    <footer>RoTruyện · RoHub <span>Next.js + React + TypeScript</span></footer>
  </main>;
}
