// Vercel serverless: proxy HLS cho AniMapper (server DU của AnimeVietSub).
// Trình duyệt không tự đặt được Referer nên playlist/segment phải đi qua server.
//
// Bảo mật (tránh trở thành open proxy):
//  - Lượt đầu chỉ nhận playlist của api.animapper.net/api/v1/stream/source/m3u8/...
//  - Mọi URL con (segment, key, playlist con) do chính proxy viết lại và KÝ bằng HMAC.
//  - Chặn host nội bộ/loopback.
//
// Cần biến môi trường trên Vercel: HLS_PROXY_SECRET (chuỗi ngẫu nhiên dài).

const crypto = require('crypto');
const net = require('net');
const { Readable } = require('stream');

const REFERER = 'https://animevietsub.nl/';
const FIRST_HOP_HOST = 'api.animapper.net';
const FIRST_HOP_PREFIX = '/api/v1/stream/source/m3u8/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function sign(secret, value) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex').slice(0, 32);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function isPrivateHost(host) {
  let h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;

  const version = net.isIP(h);
  if (version === 4) {
    const parts = h.split('.').map(Number);
    const a = parts[0], b = parts[1], c = parts[2];
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 192 && b === 0 && c === 0) return true;
    if (a === 192 && b === 0 && c === 2) return true;
    if (a === 192 && b === 88 && c === 99) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    return false;
  }
  if (version === 6) {
    // Conservatively reject IPv4-mapped IPv6 as well as unspecified, loopback,
    // unique-local and link-local ranges.
    if (h === '::' || h === '::1' || h.startsWith('::ffff:')) return true;
    if (/^(fc|fd)/.test(h) || /^fe[89ab]/.test(h)) return true;
  }
  return false;
}

function safeHttpUrl(value, baseUrl) {
  const url = new URL(value, baseUrl);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Giao thức URL con không hỗ trợ');
  if (url.username || url.password || isPrivateHost(url.hostname)) throw new Error('Host URL con bị chặn');
  return url.href;
}

function proxify(secret, absoluteUrl) {
  return '/api/hls?u=' + encodeURIComponent(absoluteUrl) + '&s=' + sign(secret, absoluteUrl);
}

function rewritePlaylist(secret, text, baseUrl) {
  return text.split(/\r?\n/).map(function (line) {
    const t = line.trim();
    if (!t) return line;
    if (t.charAt(0) === '#') {
      // Rewrite every URI attribute (key, map, media, iframe stream, etc.).
      return line.replace(/URI="([^"]+)"/g, function (_, uri) {
        return 'URI="' + proxify(secret, safeHttpUrl(uri, baseUrl)) + '"';
      });
    }
    return proxify(secret, safeHttpUrl(t, baseUrl));
  }).join('\n');
}

async function fetchWithSafeRedirects(url, headers, signal) {
  let current = new URL(url);
  for (let hop = 0; hop <= 5; hop++) {
    if ((current.protocol !== 'https:' && current.protocol !== 'http:') || current.username || current.password || isPrivateHost(current.hostname)) {
      throw new Error('Chuyển hướng đến host/giao thức bị chặn');
    }
    const response = await fetch(current.href, { headers: headers, signal: signal, redirect: 'manual' });
    const location = response.headers.get('location');
    if (![301, 302, 303, 307, 308].includes(response.status) || !location) {
      return { response: response, finalUrl: current.href };
    }
    if (hop === 5) throw new Error('Quá nhiều chuyển hướng upstream');
    current = new URL(location, current);
  }
  throw new Error('Không thể theo chuyển hướng upstream');
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.HLS_PROXY_SECRET;
  if (!secret) return res.status(500).json({ error: 'Thiếu biến môi trường HLS_PROXY_SECRET trên Vercel' });

  const raw = String((req.query && req.query.u) || '');
  const sig = String((req.query && req.query.s) || '');
  let target;
  try { target = new URL(raw); } catch (_) { return res.status(400).json({ error: 'URL không hợp lệ' }); }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') return res.status(400).json({ error: 'Giao thức không hỗ trợ' });
  if (isPrivateHost(target.hostname)) return res.status(403).json({ error: 'Host bị chặn' });

  const firstHop = target.protocol === 'https:' && target.hostname === FIRST_HOP_HOST && target.pathname.indexOf(FIRST_HOP_PREFIX) === 0 && target.pathname.length > FIRST_HOP_PREFIX.length;
  if (target.username || target.password) return res.status(400).json({ error: 'URL không hợp lệ' });
  if (!firstHop && !safeEqual(sig, sign(secret, target.href))) {
    return res.status(403).json({ error: 'Chữ ký không hợp lệ' });
  }

  const headers = { Referer: REFERER, 'User-Agent': UA, Accept: '*/*' };
  if (req.headers.range) headers.Range = req.headers.range;

  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, 25000);
  let upstream;
  try {
    const fetched = await fetchWithSafeRedirects(target.href, headers, ctrl.signal);
    upstream = fetched.response;
    target = new URL(fetched.finalUrl);
  } catch (e) {
    clearTimeout(timer);
    return res.status(502).json({ error: 'Upstream lỗi', detail: String((e && e.message) || e) });
  }

  const ct = upstream.headers.get('content-type') || '';
  const looksPlaylist = firstHop || /mpegurl/i.test(ct) || /\.m3u8$/i.test(target.pathname);

  if (looksPlaylist) {
    let body;
    try { body = await upstream.text(); }
    catch (e) {
      clearTimeout(timer);
      return res.status(502).json({ error: 'Không đọc được playlist upstream', detail: String((e && e.message) || e) });
    }
    clearTimeout(timer);
    if (!upstream.ok || body.replace(/^\uFEFF/, '').trimStart().indexOf('#EXTM3U') !== 0) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(upstream.ok ? 502 : upstream.status).json({
        error: 'Upstream không trả playlist hợp lệ',
        status: upstream.status
      });
    }
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-store');
    try {
      return res.status(200).send(rewritePlaylist(secret, body, target.href));
    } catch (e) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({ error: 'Playlist chứa URL con không an toàn hoặc không hợp lệ', detail: String((e && e.message) || e) });
    }
  }

  clearTimeout(timer);
  res.status(upstream.status);
  if (ct) res.setHeader('Content-Type', ct);
  ['content-length', 'content-range', 'accept-ranges'].forEach(function (h) {
    const v = upstream.headers.get(h);
    if (v) res.setHeader(h, v);
  });
  res.setHeader('Cache-Control', upstream.ok ? 'public, max-age=3600' : 'no-store');
  if (!upstream.body) return res.end();
  Readable.fromWeb(upstream.body).on('error', function () { try { res.end(); } catch (_) {} }).pipe(res);
}

module.exports = handler;
module.exports._test = { sign: sign, rewritePlaylist: rewritePlaylist, isPrivateHost: isPrivateHost };