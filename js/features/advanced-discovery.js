/* RoFlix Advanced Discovery: client-side filters for the currently loaded result page. */
(function () {
  'use strict';
  const GENRES = [
    'Hành Động','Phiêu Lưu','Hoạt Hình','Hài','Hình Sự','Tài Liệu','Chính Kịch','Gia Đình',
    'Giả Tưởng','Lịch Sử','Kinh Dị','Âm Nhạc','Bí Ẩn','Lãng Mạn','Khoa Học Viễn Tưởng',
    'Thể Thao','Chiến Tranh','Tâm Lý','Tình Cảm','Cổ Trang','Võ Thuật','Học Đường','Phim 18+'
  ];
  const css = `
  #rf-discovery{margin:0 0 22px;padding:0;border:1px solid #30313d;border-radius:13px;background:#191a22;color:#f4f4f7;overflow:hidden}
  #rf-discovery .rf-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;background:#191a22}
  #rf-discovery .rf-title{font-size:19px;font-weight:850;letter-spacing:.01em}
  #rf-discovery .rf-note{color:#aeb0ba;font-size:12px;line-height:1.5}
  #rf-discovery .rf-chip{border:1px solid transparent;background:transparent;color:#d4d5dc;border-radius:7px;padding:7px 10px;font-size:12px;font-weight:550;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s,border-color .15s}
  #rf-discovery .rf-chip:hover{background:#282a35;color:#fff}
  #rf-discovery .rf-chip.active{background:#252631;border-color:#4b4d5b;color:#ffd36b}
  #rf-discovery #rf-presets{display:none}#rf-discovery .rf-actions{display:flex;gap:5px;flex-wrap:wrap;align-items:center}
  #rf-discovery #rf-advanced-fields{border-top:1px solid #30313d}
  #rf-discovery .rf-row{display:grid;grid-template-columns:125px minmax(0,1fr);gap:12px;padding:10px 14px;border-bottom:1px dashed #30313d;align-items:start}
  #rf-discovery .rf-row-title{font-size:12px;font-weight:800;color:#e5e6eb;text-align:right;padding:8px 0}
  #rf-discovery .rf-row-options{display:flex;flex-wrap:wrap;gap:3px 5px;min-width:0}
  #rf-discovery .rf-fields{display:none;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:12px 16px;border-bottom:1px dashed #30313d}
  #rf-discovery label{display:flex;flex-direction:column;gap:6px;color:#c1c3ce;font-size:12px;font-weight:700}
  #rf-discovery select,#rf-discovery input{width:100%;min-width:0;border:1px solid #3a3c49;background:#20222d;color:#f8fafc;border-radius:8px;padding:9px 10px;font-size:13px}
  #rf-discovery .rf-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 14px}
  #rf-discovery .rf-apply{border:0;border-radius:999px;background:#ffd36b;color:#171717;font-weight:850;padding:10px 17px;cursor:pointer}
  #rf-discovery .rf-close{border:1px solid #777985;border-radius:999px;background:transparent;color:#f4f4f7;padding:9px 18px;cursor:pointer}
  #rf-discovery button:focus-visible,#rf-discovery select:focus-visible,#rf-discovery input:focus-visible{outline:2px solid #ffd36b;outline-offset:2px}
  @media(max-width:700px){#rf-discovery .rf-row{grid-template-columns:1fr;gap:4px;padding:9px 10px}#rf-discovery .rf-row-title{text-align:left;padding:0}#rf-discovery .rf-fields{grid-template-columns:repeat(2,minmax(0,1fr));padding:10px}#rf-discovery .rf-chip{font-size:12px;padding:7px 9px}}
  @media(max-width:420px){#rf-discovery .rf-fields{grid-template-columns:1fr}}
  `;
  function addStyle(){if(document.getElementById('rf-discovery-css'))return;const s=document.createElement('style');s.id='rf-discovery-css';s.textContent=css;document.head.appendChild(s)}
  function findHost(){return document.getElementById('movie-list-section')||document.getElementById('movie-grid-container')?.parentElement}
  function mount(){
    const host=findHost(); if(!host||document.getElementById('rf-discovery'))return;
    addStyle();
    const box=document.createElement('section');box.id='rf-discovery';
    box.innerHTML=`
      <div class="rf-head"><div><div class="rf-title">Bộ lọc phim</div><div class="rf-note" id="rf-filter-context">Đang xem danh sách phim. Mở bộ lọc khi muốn thu hẹp kết quả.</div></div><button type="button" class="rf-chip" id="rf-advanced-toggle" aria-expanded="false">⚙️ Bộ lọc</button></div>
      <div id="rf-advanced-fields" hidden>
        <div class="rf-row"><div class="rf-row-title">Bộ lọc nhanh:</div><div class="rf-row-options" id="rf-presets">
          <button type="button" class="rf-chip active" data-preset="all">Tất cả</button><button type="button" class="rf-chip" data-preset="top">Điểm cao</button><button type="button" class="rf-chip" data-preset="year">Phim mới</button><button type="button" class="rf-chip" data-preset="classic">Kinh điển</button><button type="button" class="rf-chip" data-preset="action">Hành động</button><button type="button" class="rf-chip" data-preset="animation">Hoạt hình</button>
        </div></div>
        <div class="rf-row"><div class="rf-row-title">Loại phim:</div><div class="rf-row-options" id="rf-kind-options"><button type="button" class="rf-chip active" data-kind="">Tất cả</button><button type="button" class="rf-chip" data-kind="single">Phim lẻ</button><button type="button" class="rf-chip" data-kind="series">Phim bộ</button></div></div>
        <div class="rf-row"><div class="rf-row-title">Điểm IMDb:</div><div class="rf-row-options" id="rf-rating-options"><button type="button" class="rf-chip active" data-rating="0">Tất cả</button><button type="button" class="rf-chip" data-rating="5">5.0+</button><button type="button" class="rf-chip" data-rating="6">6.0+</button><button type="button" class="rf-chip" data-rating="7">7.0+</button><button type="button" class="rf-chip" data-rating="8">8.0+</button><button type="button" class="rf-chip" data-rating="9">9.0+</button></div></div>
        <div class="rf-row"><div class="rf-row-title">Thể loại:</div><div class="rf-row-options" id="rf-genre-options"><button type="button" class="rf-chip active" data-genre="">Tất cả</button></div></div>
        <div class="rf-row"><div class="rf-row-title">Năm sản xuất:</div><div class="rf-row-options" id="rf-year-options"><button type="button" class="rf-chip active" data-year="">Tất cả</button></div></div>
        <div class="rf-row"><div class="rf-row-title">Sắp xếp:</div><div class="rf-row-options" id="rf-sort-options"><button type="button" class="rf-chip active" data-sort="default">Mới nhất</button><button type="button" class="rf-chip" data-sort="rating">Điểm IMDb</button><button type="button" class="rf-chip" data-sort="views">Lượt xem</button></div></div>
        <div class="rf-fields">
          <label>Thể loại<select id="rf-filter-genre"><option value="">Tất cả thể loại</option></select></label>
          <label>Năm từ<input id="rf-year-from" type="number" min="1900" max="2099" placeholder="Ví dụ: 2010"></label>
          <label>Năm đến<input id="rf-year-to" type="number" min="1900" max="2099" placeholder="Ví dụ: 2026"></label>
          <label>Điểm tối thiểu<select id="rf-rating-min"><option value="0">Mọi mức điểm</option><option value="5">⭐ 5.0+</option><option value="6">⭐ 6.0+</option><option value="7">⭐ 7.0+</option><option value="8">⭐ 8.0+</option><option value="9">⭐ 9.0+</option></select></label>
          <label>Sắp xếp<select id="rf-sort"><option value="default">Mặc định</option><option value="rating">Điểm cao đến thấp</option><option value="year-desc">Năm mới đến cũ</option><option value="year-asc">Năm cũ đến mới</option><option value="title">Tên A → Z</option></select></label>
          <label>Kiểu nội dung<select id="rf-kind"><option value="">Tất cả</option><option value="series">Ưu tiên phim bộ</option><option value="single">Ưu tiên phim lẻ</option></select></label>
        </div>
        <div class="rf-footer"><span class="rf-note" id="rf-filter-status">Bộ lọc áp dụng lên danh sách đang hiển thị.</span><div class="rf-actions" style="margin:0"><button type="button" class="rf-chip" id="rf-reset">Đặt lại</button><button type="button" class="rf-apply" id="rf-apply">Lọc kết quả　→</button><button type="button" class="rf-close" id="rf-close">Đóng</button></div></div>
      </div>`;
    host.insertBefore(box,host.firstChild);
    const gs=box.querySelector('#rf-filter-genre');
    GENRES.forEach(g=>{const o=document.createElement('option');o.value=genreSlug(g);o.textContent=g;gs.appendChild(o);const b=document.createElement('button');b.type='button';b.className='rf-chip';b.dataset.genre=o.value;b.textContent=g;box.querySelector('#rf-genre-options').appendChild(b)});
    for(let y=new Date().getFullYear();y>=1990;y--){const b=document.createElement('button');b.type='button';b.className='rf-chip';b.dataset.year=String(y);b.textContent=String(y);box.querySelector('#rf-year-options').appendChild(b);}
    function syncChips(selector,attr,value){box.querySelectorAll(selector).forEach(b=>b.classList.toggle('active',b.getAttribute(attr)==String(value)));}
    function syncAll(){syncChips('[data-genre]','data-genre',gs.value);syncChips('[data-year]','data-year',box.querySelector('#rf-year-from').value);syncChips('[data-rating]','data-rating',box.querySelector('#rf-rating-min').value);syncChips('[data-kind]','data-kind',box.querySelector('#rf-kind').value);syncChips('[data-sort]','data-sort',box.querySelector('#rf-sort').value);}
    box.querySelector('#rf-genre-options').addEventListener('click',e=>{const b=e.target.closest('[data-genre]');if(!b)return;gs.value=b.dataset.genre;syncAll()});
    box.querySelector('#rf-year-options').addEventListener('click',e=>{const b=e.target.closest('[data-year]');if(!b)return;box.querySelector('#rf-year-from').value=b.dataset.year;box.querySelector('#rf-year-to').value=b.dataset.year;syncAll()});
    box.querySelector('#rf-rating-options').addEventListener('click',e=>{const b=e.target.closest('[data-rating]');if(!b)return;box.querySelector('#rf-rating-min').value=b.dataset.rating;syncAll()});
    box.querySelector('#rf-kind-options').addEventListener('click',e=>{const b=e.target.closest('[data-kind]');if(!b)return;box.querySelector('#rf-kind').value=b.dataset.kind;syncAll()});
    box.querySelector('#rf-sort-options').addEventListener('click',e=>{const b=e.target.closest('[data-sort]');if(!b)return;box.querySelector('#rf-sort').value=b.dataset.sort;syncAll()});
    box.querySelector('#rf-advanced-fields').addEventListener('change',syncAll);
    syncAll();
    if(typeof currentGenreSlug!=='undefined' && [...gs.options].some(o=>o.value===currentGenreSlug)) gs.value=currentGenreSlug;
    box.querySelector('#rf-advanced-toggle').addEventListener('click',()=>{const f=box.querySelector('#rf-advanced-fields');f.hidden=!f.hidden;box.querySelector('#rf-advanced-toggle').setAttribute('aria-expanded',String(!f.hidden));box.querySelector('#rf-advanced-toggle').textContent=f.hidden?'⚙️ Bộ lọc':'✕ Đóng bộ lọc';if(!f.hidden){const active=typeof currentGenreSlug!=='undefined'?currentGenreSlug:'';if(active && [...gs.options].some(o=>o.value===active))gs.value=active;const label=GENRES.find(g=>genreSlug(g)===active);const context=box.querySelector('#rf-filter-context');if(context)context.textContent=active?'Thể loại đang chọn: '+(label||active)+' · Chọn thêm tiêu chí để lọc sâu.':'Chọn các tiêu chí bên dưới để lọc danh sách phim.';}});
    const context=box.querySelector('#rf-filter-context');
    if(context){const current=typeof currentGenreSlug!=='undefined'?currentGenreSlug:'';context.textContent=current?'Thể loại đang chọn: '+current+' · Các tiêu chí bổ sung sẽ lọc sâu danh sách này.':'Mở bộ lọc khi muốn thu hẹp danh sách phim.';}
    box.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{box.querySelectorAll('[data-preset]').forEach(x=>x.classList.toggle('active',x===b));applyPreset(b.dataset.preset)}));
    box.querySelector('#rf-apply').addEventListener('click',applyFilters);
    box.querySelector('#rf-close').addEventListener('click',()=>{box.querySelector('#rf-advanced-fields').hidden=true;box.querySelector('#rf-advanced-toggle').setAttribute('aria-expanded','false');box.querySelector('#rf-advanced-toggle').textContent='⚙️ Bộ lọc';});
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
    box.querySelector('#rf-advanced-toggle').textContent='✕ Đóng bộ lọc';
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
    const raw=String(value||'').toLowerCase();
    if(window.RoFlixUnifiedGenreMap?.[raw])return window.RoFlixUnifiedGenreMap[raw];
    if(window.RoFlixGenreProviderSlugs?.[raw])return raw;
    if(['hanh-dong','phieu-luu','hoat-hinh','phim-hai','hinh-su','tai-lieu','chinh-kich','gia-dinh','gia-tuong','lich-su','kinh-di','phim-nhac','bi-an','lang-man','khoa-hoc-vien-tuong','chien-tranh','tam-ly','tinh-cam','co-trang','mien-tay','phim-18'].includes(raw))return raw;
    const aliases={'hành động':'hanh-dong','phiêu lưu':'phieu-luu','hoạt hình':'hoat-hinh','hài':'phim-hai','hình sự':'hinh-su','tài liệu':'tai-lieu','chính kịch':'chinh-kich','gia đình':'gia-dinh','giả tưởng':'vien-tuong','lịch sử':'lich-su','kinh dị':'kinh-di','âm nhạc':'am-nhac','bí ẩn':'bi-an','lãng mạn':'lang-man','khoa học viễn tưởng':'khoa-hoc-vien-tuong','thể thao':'the-thao','chiến tranh':'chien-tranh','tâm lý':'tam-ly','tình cảm':'tinh-cam','cổ trang':'co-trang','võ thuật':'vo-thuat','học đường':'hoc-duong','phim 18+':'phim-18'};
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
      const genres=(c.dataset.rfGenre||'').split('|').map(genreSlug);
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
        if(sort==='views')return (Number(b.dataset.rfViews)||0)-(Number(a.dataset.rfViews)||0);
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
