import Link from "next/link";

export default function HomePage() {
  return (
    <main className="hubShell">
      <header className="hubBrand">
        <span className="hubMark">R</span>
        <span className="hubWordmark">Ro<span>Hub</span><small>ONE HUB. MANY WORLDS.</small></span>
      </header>
      <section className="hubIntro">
        <p className="hubEyebrow">CHÀO MỪNG ĐẾN VỚI ROHUB</p>
        <h1>Một điểm đến.<br /><span>Hai thế giới để khám phá.</span></h1>
        <p>Chọn nơi bạn muốn bắt đầu. Xem phim cùng RoFlix hoặc đắm mình trong những câu chuyện tại RoTruyện.</p>
      </section>
      <section className="hubChoices" aria-label="Chọn nền tảng">
        <a className="hubChoice hubFlix" href="/roflix.html">
          <span className="hubOrb" aria-hidden="true" /><span className="hubIcon" aria-hidden="true">▶</span>
          <h2>RoFlix</h2>
          <p>Thế giới phim ảnh trong tầm tay. Khám phá phim yêu thích và tiếp tục hành trình giải trí của bạn.</p>
          <span className="hubGo">Khám phá RoFlix <span>→</span></span>
        </a>
        <Link className="hubChoice hubStory" href="/rotruyen">
          <span className="hubOrb" aria-hidden="true" /><span className="hubIcon" aria-hidden="true">▤</span>
          <h2>RoTruyện</h2>
          <p>Nền tảng đọc truyện mới, xây dựng bằng Next.js, React và TypeScript. Tìm truyện và tiếp tục hành trình đọc.</p>
          <span className="hubGo">Khám phá RoTruyện <span>→</span></span>
        </Link>
      </section>
      <footer className="hubFooter">© 2026 RoHub · Một hệ sinh thái, nhiều trải nghiệm.</footer>
    </main>
  );
}
