'use strict';

// Adapter ported from hashi173/truyenviet.koplugin (MIT).
// Upstream: https://github.com/hashi173/truyenviet.koplugin
// Only allow-listed HTTPS hosts are fetched.
const SOURCES = {
  truyenfull: { id: 'truyenfull', name: 'TruyenFull', kind: 'novel', base: 'https://truyenfull.live' },
  truyendich: { id: 'truyendich', name: 'Truyện Dịch', kind: 'novel', base: 'https://truyendich.ai' }
};
const ALLOWED_HOSTS = new Set(Object.values(SOURCES).map(s => new URL(s.base).hostname));
function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.end(JSON.stringify(body));
}
function decodeHtml(v) {
  return String(v || '').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function stripTags(v) {
  return decodeHtml(String(v || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}
function attr(tag, name) {
  const m = String(tag || '').match(new RegExp("\\b" + name + "\\s*=\\s*[\"']([^\"']*)[\"']", "i"));
  return m ? decodeHtml(m[1]) : '';
}
function absolute(base, path) {
  try { const u = new URL(path, base); return u.protocol === 'https:' && ALLOWED_HOSTS.has(u.hostname) ? u.href : ''; }
  catch (_) { return ''; }
}
function imageUrl(base, path) {
  try { const u = new URL(path, base); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; }
  catch (_) { return ''; }
}
async function fetchPage(url, referer) {
  const target = new URL(url);
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) throw new Error('Nguồn truyện không nằm trong danh sách cho phép.');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(target.href, { signal: controller.signal, headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RoTruyen/1.0; +https://github.com/HOANGJKERD/roflix-hub)',
      'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'vi,en-US;q=0.8,en;q=0.6',
      'Referer': referer || target.origin + '/'
    }});
    if (!response.ok) throw new Error('Nguồn trả HTTP ' + response.status);
    const html = await response.text();
    if (html.length > 4000000) throw new Error('Trang nguồn vượt giới hạn kích thước.');
    if (/just a moment|cloudflare ray id/i.test(html.slice(0, 10000))) throw new Error('Nguồn đang chặn yêu cầu tự động (Cloudflare).');
    return html;
  } catch (e) { if (e.name === 'AbortError') throw new Error('Nguồn truyện phản hồi quá thời gian.'); throw e; }
  finally { clearTimeout(timer); }
}
function parseSearch(source, html) {
  const rows = [];
  if (source.id === 'truyenfull') {
    const re = /<h3([^>]*)>([\s\S]*?)<\/h3>/gi; let m;
    while ((m = re.exec(html))) {
      if (!/truyen-title|itemprop/i.test(m[1])) continue;
      const a = m[2].match(/<a\b[^>]*>/i)?.[0] || '';
      const href = attr(a, 'href'), title = attr(a, 'title') || stripTags(m[2]);
      const before = html.slice(Math.max(0, m.index - 1800), m.index + 900);
      const imgs = [...before.matchAll(/(?:data-image|data-src|data-original|src)=["']([^"']+)["']/gi)];
      const cover = imgs.length ? imageUrl(source.base, imgs[imgs.length - 1][1]) : '', story = absolute(source.base, href);
      if (story && title) rows.push({ id: story, source: 'truyenviet', provider: source.id, title, author: 'Chưa rõ tác giả', kind: 'Tiểu thuyết', contentType: 'novel', cover, description: '', status: 'unknown', externalUrl: story });
    }
  } else {
    const re = /<a([^>]*)href=["'](\/doc-truyen\/[^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi; let m;
    while ((m = re.exec(html))) {
      const attrs = m[1] + ' ' + m[3], body = m[4], image = body.match(/<img\b[^>]*>/i)?.[0] || '';
      const title = attr(attrs, 'title') || attr(image, 'alt').replace(/^Ảnh bìa truyện\s*/i, '') || stripTags(body);
      const cover = imageUrl(source.base, attr(image, 'src') || attr(image, 'data-src')), story = absolute(source.base, m[2]);
      if (story && title) rows.push({ id: story, source: 'truyenviet', provider: source.id, title, author: 'Chưa rõ tác giả', kind: 'Tiểu thuyết', contentType: 'novel', cover, description: '', status: 'unknown', externalUrl: story });
    }
  }
  const unique = new Map(); rows.forEach(x => { if (!unique.has(x.id)) unique.set(x.id, x); });
  return [...unique.values()].slice(0, 40);
}
function parseChapters(source, html, storyUrl) {
  const rows = [], re = /<a([^>]*)>([\s\S]*?)<\/a>/gi; let m;
  while ((m = re.exec(html))) {
    const href = attr(m[1], 'href'); if (!href || !/\/chuong[-/]/i.test(href)) continue;
    const chapterUrl = absolute(source.base, href), title = stripTags(m[2]) || attr(m[1], 'title');
    if (chapterUrl && title) rows.push({ id: chapterUrl, url: chapterUrl, title, chapter_number: title.match(/(?:chương|chapter)\s*([\d.]+)/i)?.[1] || String(rows.length + 1), storyUrl, provider: source.id, contentType: 'novel' });
  }
  const unique = new Map(); rows.forEach(x => { if (!unique.has(x.url)) unique.set(x.url, x); });
  return [...unique.values()].slice(0, 500);
}
function parseChapterContent(source, html, chapter) {
  const tm = html.match(/<h[12][^>]*class=["'][^"']*chapter-title[^"']*["'][^>]*>([\s\S]*?)<\/h[12]>/i)
    || html.match(/<h1[^>]*itemprop=["']name["'][^>]*>([\s\S]*?)<\/h1>/i);
  let content = '';
  if (source.id === 'truyenfull') {
    const start = html.search(/id=["']chapter-c["']/i);
    if (start >= 0) { const p = html.indexOf('>', start) + 1, tail = html.slice(p), end = tail.search(/<\/div>\s*<div id=["']ads-chapter-bottom|<\/div>\s*<hr class=["']chapter-end/i); if (end > 0) content = tail.slice(0, end); }
  } else {
    let start = html.search(/id=["']original-content-tab["']/i);
    if (start >= 0) { start = html.indexOf('>', start) + 1; const tail = html.slice(start), end = tail.search(/<\/section>|<\/div>\s*<nav/i); if (end > 0) content = tail.slice(0, end); }
    else { start = html.search(/id=["']chapter-c["']/i); if (start >= 0) { start = html.indexOf('>', start) + 1; content = html.slice(start, start + 100000).split(/<\/div>/i)[0]; } }
  }
  content = content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<(iframe|form|button|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '').replace(/javascript:/gi, '');
  const text = stripTags(content);
  if (!text) throw new Error('Không nhận diện được nội dung chương từ HTML của nguồn.');
  return { id: chapter.url, title: tm ? stripTags(tm[1]) : chapter.title, content: text, provider: source.id, externalUrl: chapter.url, kind: 'novel' };
}
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { error: 'Method not allowed' }); }
  try {
    const u = new URL(req.url, 'https://rohub.invalid'), action = (u.searchParams.get('action') || 'search').toLowerCase();
    const sourceId = (u.searchParams.get('source') || 'all').toLowerCase();
    const sources = sourceId === 'all' ? Object.values(SOURCES) : [SOURCES[sourceId]].filter(Boolean);
    if (!sources.length) return json(res, 400, { error: 'Nguồn không hợp lệ.', allowed: Object.keys(SOURCES) });
    if (!['search', 'chapters', 'chapter'].includes(action)) return json(res, 400, { error: 'action không hợp lệ.' });
    if (action === 'search') {
      const q = (u.searchParams.get('q') || '').trim().slice(0, 120);
      const results = await Promise.allSettled(sources.map(async s => {
        const target = s.id === 'truyenfull'
          ? (q ? s.base + '/tim-kiem/?tukhoa=' + encodeURIComponent(q).replace(/%20/g, '+') : s.base + '/danh-sach/truyen-full/')
          : (q ? s.base + '/tim-kiem?keyword=' + encodeURIComponent(q).replace(/%20/g, '+') : s.base + '/danh-sach/truyen-full');
        return { source: s.id, items: parseSearch(s, await fetchPage(target)) };
      }));
      const items = [], errors = [];
      results.forEach((r, i) => r.status === 'fulfilled' ? items.push(...r.value.items) : errors.push({ source: sources[i].id, message: r.reason?.message || 'Không tải được nguồn.' }));
      return json(res, items.length || !errors.length ? 200 : 502, { source: 'truyenviet.koplugin-adapter', items, errors, total: items.length });
    }
    const storyUrl = u.searchParams.get('url') || '';
    let parsed; try { parsed = new URL(storyUrl); } catch (_) { return json(res, 400, { error: 'Thiếu URL hợp lệ.' }); }
    const source = Object.values(SOURCES).find(s => s.base === parsed.origin);
    if (!source || parsed.protocol !== 'https:') return json(res, 400, { error: 'URL không thuộc nguồn được cho phép.' });
    const html = await fetchPage(storyUrl, storyUrl);
    if (action === 'chapters') { const chapters = parseChapters(source, html, storyUrl); return json(res, 200, { source: source.id, storyUrl, chapters, total: chapters.length }); }
    const chapter = { url: storyUrl, title: u.searchParams.get('title') || 'Chương truyện' };
    return json(res, 200, { chapter: parseChapterContent(source, html, chapter) });
  } catch (e) { return json(res, 502, { error: e.message || 'Nguồn truyện hiện không khả dụng.' }); }
};
