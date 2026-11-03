/* RoFlix movie-only autocomplete: NguonC first, VSMOV fallback */
(function () {
  'use strict';
  const IDS = ['search-input', 'search-input-mobile'];
  const cache = new Map();
  const controllers = new WeakMap();
  const timers = new WeakMap();
  const CACHE_TTL = 90000;
  const MAX_RESULTS = 7;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pick = (...v) => v.find(x => x !== undefined && x !== null && String(x).trim()) || '';
  function sourceUrl(sid, q) {
    const base = sid === 'kkphim' ? 'https://phim.nguonc.com/api/films/search' : 'https://vsmov.com/api/tim-kiem';
    return base + '?keyword=' + encodeURIComponent(q) + '&page=1';
  }
  function itemsOf(d) {
    const x = d?.items || d?.data?.items || d?.result?.items || (Array.isArray(d?.data) ? d.data : null) || d?.movies || d?.results || [];
    return Array.isArray(x) ? x : [];
  }
  function posterOf(m, sid) {
    const raw = pick(m.poster_url, m.thumb_url, m.poster, m.thumb);
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return new URL(raw, sid === 'kkphim' ? 'https://phim.nguonc.com/' : 'https://vsmov.com/').href;
  }
  function mapItem(m, sid) {
    const lang = pick(m.lang, m.language, m.episode_current, '');
    const status = [];
    const l = String(lang).toLowerCase();
    if (/lồng tiếng|long tieng/.test(l)) status.push('Lồng tiếng');
    if (/thuyết minh|thuyet minh/.test(l)) status.push('Thuyết minh');
    if (/vietsub|phụ đề|phu de|sub/.test(l)) status.push('Phụ đề');
    if (!status.length && lang) status.push(String(lang));
    return {
      slug: String(m.slug || ''),
      title: pick(m.name, m.title, m.origin_name, 'Phim chưa có tên'),
      year: pick(m.year, ''),
      poster: posterOf(m, sid),
      sid,
      status: status.slice(0,2)
    };
  }
  function close(box) { if (box) { box.hidden = true; box.innerHTML = ''; } }
  function ensureBox(input) {
    const host = input.closest('.search-ios');
    if (!host) return null;
    host.classList.add('rf-autocomplete-host');
    let box = host.querySelector('.rf-movie-suggest');
    if (!box) {
      box = document.createElement('div');
      box.className = 'rf-movie-suggest';
      box.hidden = true;
      box.setAttribute('role','listbox');
      host.appendChild(box);
    }
    return box;
  }
  function render(box, list, query) {
    if (!list.length) {
      box.innerHTML = '<div class="rf-suggest-empty">Không tìm thấy phim phù hợp.</div>';
      box.hidden = false;
      return;
    }
    box.innerHTML = list.slice(0,MAX_RESULTS).map((m,i) => `
      <button type="button" class="rf-suggest-item" role="option" data-index="${i}">
        <img src="${esc(m.poster || 'https://placehold.co/64x88/171923/9ca3af?text=RF')}" alt="" loading="lazy" onerror="this.src='https://placehold.co/64x88/171923/9ca3af?text=RF'">
        <span class="rf-suggest-copy"><strong>${esc(m.title)}</strong><small>${esc(m.year || 'Chưa rõ năm')}${m.status.length ? ' · ' + esc(m.status.join(' / ')) : ''}</small></span>
        <span class="rf-suggest-arrow">›</span>
      </button>`).join('');
    box.hidden = false;
    box.querySelectorAll('.rf-suggest-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const m = list[Number(btn.dataset.index)];
        if (!m?.slug) return;
        IDS.forEach(id => { const el=document.getElementById(id); if(el) el.value=m.title; });
        IDS.forEach(id => close(document.getElementById(id)?.closest('.search-ios')?.querySelector('.rf-movie-suggest')));
        clearTimeout(window.searchTimeout);
        window.searchKeyword = '';
        if (typeof window.viewMovieDetail === 'function') window.viewMovieDetail(m.slug, m.sid);
      });
    });
  }
  async function search(q, input, box) {
    const key = q.toLocaleLowerCase('vi');
    const hit = cache.get(key);
    if (hit && Date.now()-hit.time < CACHE_TTL) { render(box,hit.items,q); return; }
    const previous = controllers.get(input);
    if (previous) previous.abort();
    const controller = new AbortController();
    controllers.set(input,controller);
    box.innerHTML = '<div class="rf-suggest-loading">Đang tìm phim…</div>';
    box.hidden = false;
    let found = [];
    for (const sid of ['kkphim','vsmov']) {
      try {
        let res;
        for (let attempt=0; attempt<2; attempt++) {
          res = await fetch(sourceUrl(sid,q), {signal:controller.signal, headers:{'Accept':'application/json'}});
          if (res.status===429 && attempt===0) {
            const retry=Number(res.headers.get('Retry-After'));
            await new Promise(resolve=>setTimeout(resolve,Math.min(3000,Math.max(500,retry>0?retry*1000:1000))));
            continue;
          }
          break;
        }
        if (!res.ok) throw new Error('HTTP '+res.status);
        const type=res.headers.get('content-type')||'';
        if(type && !/json/i.test(type)) throw new Error('API không trả JSON: '+type);
        const data = await res.json();
        const rows = itemsOf(data).map(m=>mapItem(m,sid)).filter(m=>m.slug);
        found = found.concat(rows);
        if (found.length >= MAX_RESULTS) break;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    if (controllers.get(input) !== controller) return;
    const seen = new Set();
    found = found.filter(m => { const k=m.slug.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; }).slice(0,MAX_RESULTS);
    cache.set(key,{items:found,time:Date.now()});
    if (cache.size > 40) cache.delete(cache.keys().next().value);
    render(box,found,q);
  }
  function bind(input) {
    if (input.dataset.rfAutocompleteBound) return;
    input.dataset.rfAutocompleteBound='1';
    const box=ensureBox(input);
    if(!box) return;
    input.addEventListener('input', () => {
      clearTimeout(window.searchTimeout);
      clearTimeout(timers.get(input));
      const q=input.value.trim();
      if(q.length<2){close(box);return;}
      if(controllers.get(input)) controllers.get(input).abort();
      timers.set(input,setTimeout(()=>search(q,input,box),280));
    });
    input.addEventListener('keydown', e => {
      if(e.key==='Escape'){close(box);return;}
      if(e.key==='Enter'){
        const first=box.querySelector('.rf-suggest-item');
        if(!box.hidden && first){e.preventDefault();first.click();return;}
        clearTimeout(window.searchTimeout);
        window.searchKeyword=input.value.trim();
        if(window.searchKeyword && typeof window.renderMoviesFromAPI==='function') window.renderMoviesFromAPI(1);
        close(box);
      }
    });
    input.addEventListener('focus',()=>{if(input.value.trim().length>=2) search(input.value.trim(),input,box);});
    document.addEventListener('click',e=>{if(!input.closest('.search-ios')?.contains(e.target)) close(box);});
  }
  function installStyle(){
    if(document.getElementById('rf-movie-suggest-style'))return;
    const s=document.createElement('style');s.id='rf-movie-suggest-style';s.textContent=`
      .rf-autocomplete-host{position:relative;z-index:120}
      .rf-movie-suggest{position:absolute;top:calc(100% + 12px);left:0;width:min( min(560px, 92vw), 560px);max-height:min(68vh,520px);overflow:auto;background:#171923;border:1px solid rgba(255,255,255,.12);border-radius:16px;box-shadow:0 22px 55px rgba(0,0,0,.55);z-index:9999;padding:5px;color:#e5e7eb}
      .rf-movie-suggest[hidden]{display:none}
      .rf-suggest-item{display:flex;align-items:center;gap:12px;width:100%;padding:10px 9px;text-align:left;border:0;border-bottom:1px solid rgba(255,255,255,.07);background:transparent;color:inherit;cursor:pointer}
      .rf-suggest-item:last-child{border-bottom:0}.rf-suggest-item:hover,.rf-suggest-item:focus{background:rgba(245,158,11,.12);outline:0}
      .rf-suggest-item img{width:43px;height:59px;object-fit:cover;border-radius:8px;background:#272a35;flex:none}
      .rf-suggest-copy{display:flex;flex-direction:column;gap:5px;min-width:0}.rf-suggest-copy strong{font-size:13px;line-height:1.4;font-weight:650;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.rf-suggest-copy small{font-size:11px;color:#aeb5c3}
      .rf-suggest-arrow{margin-left:auto;color:#fbbf24;font-size:24px}.rf-suggest-loading,.rf-suggest-empty{padding:18px 12px;color:#aeb5c3;font-size:13px}
      @media(max-width:639px){.rf-movie-suggest{width:min(92vw,420px);left:auto;right:0}.rf-suggest-item img{width:40px;height:55px}}
    `;document.head.appendChild(s);
  }
  function boot(){installStyle();IDS.forEach(id=>{const el=document.getElementById(id);if(el)bind(el);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('pageshow',boot);
})();