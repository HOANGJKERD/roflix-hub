/* RoFlix Advanced Discovery: client-side filters for the currently loaded result page. */
(function () {
  'use strict';
  const GENRES = [
    'Hành Động','Phiêu Lưu','Hoạt Hình','Hài','Hình Sự','Tài Liệu','Chính Kịch','Gia Đình',
    'Giả Tưởng','Lịch Sử','Kinh Dị','Âm Nhạc','Bí Ẩn','Lãng Mạn','Khoa Học Viễn Tưởng',
    'Thể Thao','Chiến Tranh','Tâm Lý','Tình Cảm','Cổ Trang','Võ Thuật','Học Đường'
  ];
  const css = `
  #rf-discovery{margin:0 0 18px;padding:16px;border:1px solid #303244;border-radius:18px;background:linear-gradient(135deg,rgba(30,27,45,.96),rgba(13,15,25,.96));color:#f8fafc}
  #rf-discovery .rf-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  #rf-discovery .rf-title{font-size:17px;font-weight:900;letter-spacing:.01em}
  #rf-discovery .rf-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  #rf-discovery button,#rf-discovery select,#rf-discovery input{font:inherit}
  #rf-discovery .rf-chip{border:1px solid #41445a;background:#191c2b;color:#e5e7eb;border-radius:999px;padding:8px 13px;font-size:12px;font-weight:800;cursor:pointer}
  #rf-discovery .rf-chip.active,#rf-discovery .rf-chip:hover{background:#f59e0b;border-color:#f59e0b;color:#111827}
  #rf-discovery .rf-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin-top:14px}
  #rf-discovery label{display:flex;flex-direction:column;gap:6px;color:#aeb4c7;font-size:11px;font-weight:800}
  #rf-discovery select,#rf-discovery input{width:100%;min-width:0;border:1px solid #383d52;background:#0c0f18;color:#f8fafc;border-radius:10px;padding:10px;font-size:13px}
  #rf-discovery .rf-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:14px}
  #rf-discovery .rf-apply{border:0;border-radius:10px;background:linear-gradient(120deg,#fbbf24,#f59e0b);color:#111827;font-weight:900;padding:10px 16px;cursor:pointer}
  #rf-discovery .rf-note{color:#9ca3af;font-size:11px;line-height:1.5}
  @media(max-width:600px){#rf-discovery{padding:12px}#rf-discovery .rf-title{font-size:15px}}
  `;
  function addStyle(){if(document.getElementById('rf-discovery-css'))return;const s=document.createElement('style');s.id='rf-discovery-css';s.textContent=css;document.head.appendChild(s)}
  function findHost(){return document.getElementById('movie-list-section')||document.getElementById('movie-grid-container')?.parentElement}
  function mount(){
    const host=findHost(); if(!host||document.getElementById('rf-discovery'))return;
    addStyle();
    const box=document.createElement('section');box.id='rf-discovery';
    box.innerHTML=`
      <div class="rf-head"><div><div class="rf-title">🎬 Khám phá & lọc phim</div><div class="rf-note">Tìm nhanh theo gu của bạn, không cần đăng nhập.</div></div><button type="button" class="rf-chip" id="rf-advanced-toggle" aria-expanded="false">⚙️ Bộ lọc nâng cao</button></div>
      <div class="rf-actions" id="rf-presets">
        <button type="button" class="rf-chip active" data-preset="all">✨ Tổng hợp</button>
        <button type="button" class="rf-chip" data-preset="top">⭐ Điểm cao</button>
        <button type="button" class="rf-chip" data-preset="year">🆕 Phim mới</button>
        <button type="button" class="rf-chip" data-preset="classic">🏆 Kinh điển</button>
        <button type="button" class="rf-chip" data-preset="action">💥 Hành động</button>
        <button type="button" class="rf-chip" data-preset="animation">🎨 Hoạt hình</button>
      </div>
      <div id="rf-advanced-fields" hidden>
        <div class="rf-fields">
          <label>Thể loại<select id="rf-filter-genre"><option value="">Tất cả thể loại</option></select></label>
          <label>Năm từ<input id="rf-year-from" type="number" min="1900" max="2099" placeholder="Ví dụ: 2010"></label>
          <label>Năm đến<input id="rf-year-to" type="number" min="1900" max="2099" placeholder="Ví dụ: 2026"></label>
          <label>Điểm tối thiểu<select id="rf-rating-min"><option value="0">Mọi mức điểm</option><option value="5">⭐ 5.0+</option><option value="6">⭐ 6.0+</option><option value="7">⭐ 7.0+</option><option value="8">⭐ 8.0+</option><option value="9">⭐ 9.0+</option></select></label>
          <label>Sắp xếp<select id="rf-sort"><option value="default">Mặc định</option><option value="rating">Điểm cao đến thấp</option><option value="year-desc">Năm mới đến cũ</option><option value="year-asc">Năm cũ đến mới</option><option value="title">Tên A → Z</option></select></label>
          <label>Kiểu nội dung<select id="rf-kind"><option value="">Tất cả</option><option value="series">Ưu tiên phim bộ</option><option value="single">Ưu tiên phim lẻ</option></select></label>
        </div>
        <div class="rf-footer"><span class="rf-note" id="rf-filter-status">Bộ lọc áp dụng lên danh sách đang hiển thị.</span><div class="rf-actions" style="margin:0"><button type="button" class="rf-chip" id="rf-reset">Xóa lọc</button><button type="button" class="rf-apply" id="rf-apply">Áp dụng bộ lọc</button></div></div>
      </div>`;
    host.insertBefore(box,host.firstChild);
    const gs=box.querySelector('#rf-filter-genre');
    GENRES.forEach(g=>{const o=document.createElement('option');o.value=g.toLowerCase();o.textContent=g;gs.appendChild(o)});
    box.querySelector('#rf-advanced-toggle').addEventListener('click',()=>{const f=box.querySelector('#rf-advanced-fields');f.hidden=!f.hidden;box.querySelector('#rf-advanced-toggle').setAttribute('aria-expanded',String(!f.hidden))});
    box.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{box.querySelectorAll('[data-preset]').forEach(x=>x.classList.toggle('active',x===b));applyPreset(b.dataset.preset)}));
    box.querySelector('#rf-apply').addEventListener('click',applyFilters);
    box.querySelector('#rf-reset').addEventListener('click',()=>{box.querySelectorAll('select,input').forEach(x=>x.value='');box.querySelector('#rf-rating-min').value='0';box.querySelector('#rf-sort').value='default';box.querySelectorAll('[data-preset]').forEach(x=>x.classList.toggle('active',x.dataset.preset==='all'));applyPreset('all')});
  }
  function cards(){return Array.from(document.querySelectorAll('#movie-grid-container .movie-card-premium'))}
  function applyPreset(p){
    const box=document.getElementById('rf-discovery');if(!box)return;
    box.querySelector('#rf-filter-genre').value='';
    box.querySelector('#rf-year-from').value='';box.querySelector('#rf-year-to').value='';
    box.querySelector('#rf-rating-min').value='0';box.querySelector('#rf-sort').value='default';box.querySelector('#rf-kind').value='';
    if(p==='top'){box.querySelector('#rf-rating-min').value='8';box.querySelector('#rf-sort').value='rating'}
    if(p==='year'){box.querySelector('#rf-year-from').value=String(new Date().getFullYear()-2);box.querySelector('#rf-sort').value='year-desc'}
    if(p==='classic'){box.querySelector('#rf-year-to').value='2000';box.querySelector('#rf-sort').value='rating';box.querySelector('#rf-rating-min').value='7'}
    if(p==='action')box.querySelector('#rf-filter-genre').value='hành động';
    if(p==='animation')box.querySelector('#rf-filter-genre').value='hoạt hình';
    box.querySelector('#rf-advanced-fields').hidden=false;
    box.querySelector('#rf-advanced-toggle').setAttribute('aria-expanded','true');
    // Thoát chế độ trang chủ chỉ tuyển phim Âu Mỹ/Hàn; chuyển sang danh sách catalog phân trang.
    if(typeof homePriorityMode!=='undefined') homePriorityMode=false;
    if(typeof currentCountrySlug!=='undefined') currentCountrySlug='';
    if(typeof searchKeyword!=='undefined') searchKeyword='';
    const g=box.querySelector('#rf-filter-genre').value;
    if(typeof currentGenreSlug!=='undefined') currentGenreSlug=g?genreSlug(g):'';
    if(typeof currentListEndpoint!=='undefined') currentListEndpoint='phim-moi-cap-nhat';
    if(typeof renderMoviesFromAPI==='function') {
      renderMoviesFromAPI(1);
      setTimeout(applyFilters,1000);
    } else applyFilters();
  }
  function genreSlug(value){
    const aliases={'hành động':'hanh-dong','phiêu lưu':'phieu-luu','hoạt hình':'hoat-hinh','hài':'hai-huoc','hình sự':'hinh-su','tài liệu':'tai-lieu','chính kịch':'chinh-kich','gia đình':'gia-dinh','giả tưởng':'vien-tuong','lịch sử':'lich-su','kinh dị':'kinh-di','âm nhạc':'am-nhac','bí ẩn':'bi-an','lãng mạn':'lang-man','khoa học viễn tưởng':'khoa-hoc-vien-tuong','thể thao':'the-thao','chiến tranh':'chien-tranh','tâm lý':'tam-ly','tình cảm':'tinh-cam','cổ trang':'co-trang','võ thuật':'vo-thuat','học đường':'hoc-duong'};
    return aliases[String(value||'').toLowerCase()]||'';
  }
  function applyFilters(){
    const box=document.getElementById('rf-discovery');if(!box)return;
    const genre=box.querySelector('#rf-filter-genre').value;
    const from=Number(box.querySelector('#rf-year-from').value)||0;
    const to=Number(box.querySelector('#rf-year-to').value)||9999;
    const rating=Number(box.querySelector('#rf-rating-min').value)||0;
    const kind=box.querySelector('#rf-kind').value;
    const sort=box.querySelector('#rf-sort').value;
    // Bộ lọc thể loại phải truy vấn endpoint thể loại của nguồn, không chỉ ẩn các thẻ đang có.
    const requestedGenre=genre;
    const genreSlugValue=requestedGenre?genreSlug(requestedGenre):'';
    if(typeof homePriorityMode!=='undefined') homePriorityMode=false;
    if(typeof currentCountrySlug!=='undefined') currentCountrySlug='';
    if(typeof searchKeyword!=='undefined') searchKeyword='';
    if(typeof currentGenreSlug!=='undefined' && currentGenreSlug!==genreSlugValue){
      currentGenreSlug=genreSlugValue;
      if(typeof currentListEndpoint!=='undefined') currentListEndpoint='phim-moi-cap-nhat';
      if(typeof renderMoviesFromAPI==='function'){
        renderMoviesFromAPI(1);
        setTimeout(applyFilters,1000);
        return;
      }
    }
    const host=document.getElementById('movie-grid-container');if(!host)return;
    const all=cards();
    const filtered=all.filter(c=>{
      const year=Number(c.dataset.rfYear)||0;
      const score=Number(c.dataset.rfRating)||0;
      const genres=(c.dataset.rfGenre||'').toLowerCase();
      const type=(c.dataset.rfType||'').toLowerCase();
      return year>=from&&year<=to&&score>=rating&&(!genre||genres.includes(genre))&&(!kind||type===kind);
    });
    all.forEach(c=>c.hidden=true);
    filtered.forEach(c=>c.hidden=false);
    if(sort!=='default'){
      filtered.sort((a,b)=>{
        if(sort==='rating')return (Number(b.dataset.rfRating)||0)-(Number(a.dataset.rfRating)||0);
        if(sort==='year-desc')return (Number(b.dataset.rfYear)||0)-(Number(a.dataset.rfYear)||0);
        if(sort==='year-asc')return (Number(a.dataset.rfYear)||0)-(Number(b.dataset.rfYear)||0);
        return (a.dataset.rfTitle||'').localeCompare(b.dataset.rfTitle||'','vi');
      }).forEach(c=>host.appendChild(c));
    }
    box.dataset.applied='1';
    const status=box.querySelector('#rf-filter-status');
    if(status)status.textContent='Hiển thị '+filtered.length+'/'+all.length+' phim trong trang hiện tại. Điểm là dữ liệu nguồn, có thể là TMDB hoặc IMDb.';
    const count=document.getElementById('movie-count');if(count)count.textContent=String(filtered.length);
  }
  function install(){mount()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  let lastGridCount=-1;
  setInterval(()=>{const n=cards().length;if(n!==lastGridCount){lastGridCount=n;const box=document.getElementById('rf-discovery');if(box&&box.dataset.applied==='1')applyFilters()}},900);
  window.addEventListener('roflix:movies-rendered',()=>{const box=document.getElementById('rf-discovery');if(box)applyFilters()});
})();
