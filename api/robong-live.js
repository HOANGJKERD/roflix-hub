/**
 * RoBong Live / Stream API
 * GET /api/robong-live
 * GET /api/robong-live?resource=channels
 * GET /api/robong-live?resource=channels&group=FIFA%20WORLD%20CUP%202026
 * GET /api/robong-live?resource=groups
 * GET /api/robong-live?resource=play&id=vtv3hd
 *
 * Curated channels extracted from public M3U sources.
 * Response shape follows RoBong Unified API style.
 */
'use strict';

const TIMEOUT_MS = 10000;

// ---------- Curated channels (stable subset) ----------
const CURATED = [
  {
    id: 'vtv3hd',
    name: 'VTV3',
    group: 'FIFA WORLD CUP 2026',
    logo: 'https://i.ytimg.com/vi/4jr8Y13NSME/maxresdefault.jpg',
    url: 'http://42.1.99.192:8080/secureVhost/vtv3.flv?token=vtv_secret_20260706',
    type: 'flv',
    source: 'curated'
  },
  {
    id: 'vtv6hd',
    name: 'VTV6',
    group: 'FIFA WORLD CUP 2026',
    logo: 'https://raw.githubusercontent.com/vuminhthanh12/Logo/refs/heads/main/VTV6.png',
    url: 'http://42.1.99.192:8080/secureVhost/vtv6.flv?token=vtv_secret_20260706',
    type: 'flv',
    source: 'curated'
  },
  {
    id: 'vtv9hd',
    name: 'VTV9',
    group: 'FIFA WORLD CUP 2026',
    logo: 'https://i.ytimg.com/vi/APl10jiVAlQ/maxresdefault.jpg',
    url: 'http://42.1.99.192:8080/secureVhost/vtv9.flv?token=vtv_secret_20260706',
    type: 'flv',
    source: 'curated'
  },
  {
    id: 'vtv10hd',
    name: 'VTV10',
    group: 'FIFA WORLD CUP 2026',
    logo: 'https://raw.githubusercontent.com/vuminhthanh12/vuminhthanh12/refs/heads/main/VTV10.png',
    url: 'http://42.1.99.192:8080/secureVhost/vtv10.flv?token=vtv_secret_20260706',
    type: 'flv',
    source: 'curated'
  },
  {
    id: 'blcx',
    name: 'Bình Luận Cảm xúc',
    group: 'FIFA WORLD CUP 2026',
    logo: 'https://vtvgo-assets.vtvdigital.vn/assets/images/v2/channel/20260613/2026061323/TsjjtHjSSt-Logo-BLCX_3_11zon.webp',
    url: 'https://hoiquan.dpdns.org/VTVGo/?BinhLuanCamXuc',
    type: 'hls',
    source: 'curated'
  },
  {
    id: 'wc-fifa',
    name: 'Tín Hiệu Nguyên Bản',
    group: 'FIFA WORLD CUP 2026',
    logo: 'https://vtvgo-assets.vtvdigital.vn/assets/images/v2/channel/20260613/2026061323/FMxAbJrF0Q-Logo-NGUYENBAN_6_11zon.webp',
    url: 'https://hoiquan.dpdns.org/VTVGo/?WC-FiFa',
    type: 'hls',
    source: 'curated'
  },
  {
    id: 'wc-en-1',
    name: 'Kênh Tiếng Anh 1',
    group: 'FIFA WORLD CUP 2026',
    logo: 'https://vtvgo-assets.vtvdigital.vn/assets/images/v2/channel/20260617/2026061723/owe8ceyOCM-logo.webp',
    url: 'https://hoiquan.dpdns.org/VTVGo/?kenh-tieng-anh-1',
    type: 'hls',
    source: 'curated'
  },
  {
    id: 'ninochannel',
    name: 'Nino Channel',
    group: 'Sự Kiện',
    logo: 'https://raw.githubusercontent.com/vuminhthanh12/vuminhthanh12/refs/heads/main/ninochannel1.jpg',
    url: 'https://tpninosaga.duckdns.org/source/twitch.m3u8?channel=ninochannel12&token=NinoExility',
    type: 'hls',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
    },
    source: 'curated'
  }
];

// Optional remote M3U sources (can be expanded later)
const REMOTE_M3U = [
  // { id: 'freem3u', url: 'https://example.com/playlist.m3u' }
];

function str(value, fallback, max) {
  const v = typeof value === 'string' ? value.trim() : '';
  return (v || fallback || '').slice(0, max || 120);
}

function detectType(url) {
  if (!url) return 'other';
  const u = url.toLowerCase();
  if (u.includes('.m3u8')) return 'hls';
  if (u.includes('.flv')) return 'flv';
  if (u.includes('.mpd')) return 'dash';
  if (u.includes('.mp4') || u.includes('.ts')) return 'progressive';
  return 'other';
}

function parseM3u(content, sourceId) {
  const lines = String(content || '').split(/\r?\n/);
  const channels = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF')) {
      const info = parseExtInf(line);
      const next = (lines[i + 1] || '').trim();
      if (next && !next.startsWith('#')) {
        const id = info['tvg-id'] || ('ch-' + (channels.length + 1));
        channels.push({
          id: String(id).slice(0, 64),
          name: info.name || id,
          group: info['group-title'] || 'Khác',
          logo: info['tvg-logo'] || '',
          url: next,
          type: detectType(next),
          source: sourceId || 'remote'
        });
        i += 1;
      }
    }
    i += 1;
  }
  return channels;
}

function parseExtInf(line) {
  const map = {};
  const comma = line.lastIndexOf(',');
  if (comma !== -1 && comma < line.length - 1) {
    map.name = line.slice(comma + 1).trim();
  }
  const re = /([\w-]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(line))) {
    map[m[1]] = m[2];
  }
  return map;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.apple.mpegurl, text/plain, */*',
        'User-Agent': 'RoBong-Live/1.0 (+https://github.com/HOANGJKERD/roflix-hub)'
      },
      signal: controller.signal
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function loadAllChannels() {
  let list = CURATED.slice();
  for (const remote of REMOTE_M3U) {
    try {
      const text = await fetchText(remote.url);
      const parsed = parseM3u(text, remote.id);
      list = list.concat(parsed);
    } catch (_) {
      // skip dead remote
    }
  }
  return list;
}

function ok(payload) {
  return Object.assign({
    ok: true,
    api: 'RoBong Live',
    version: '1.0.0',
    fetchedAt: new Date().toISOString()
  }, payload);
}

module.exports = async function robongLive(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const q = req.query || {};
  const resource = str(q.resource, 'channels', 32).toLowerCase();
  const groupFilter = str(q.group, '', 80);
  const idFilter = str(q.id, '', 64);

  try {
    const channels = await loadAllChannels();

    if (resource === 'groups') {
      const groups = {};
      for (const ch of channels) {
        const g = ch.group || 'Khác';
        groups[g] = (groups[g] || 0) + 1;
      }
      const items = Object.keys(groups).sort().map(name => ({
        name,
        count: groups[name]
      }));
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json(ok({
        resource: 'groups',
        count: items.length,
        items
      }));
    }

    if (resource === 'play' || resource === 'channel') {
      const ch = channels.find(c => c.id === idFilter || c.name === idFilter);
      if (!ch) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(404).json({ ok: false, error: 'Channel not found', id: idFilter });
      }
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      return res.status(200).json(ok({
        resource: 'play',
        item: {
          id: ch.id,
          name: ch.name,
          group: ch.group,
          logo: ch.logo,
          url: ch.url,
          type: ch.type,
          headers: ch.headers || {},
          source: ch.source
        }
      }));
    }

    // default: channels
    let filtered = channels;
    if (groupFilter) {
      const g = groupFilter.toLowerCase();
      filtered = channels.filter(c => (c.group || '').toLowerCase().includes(g));
    }
    if (idFilter) {
      filtered = filtered.filter(c => c.id === idFilter || c.name === idFilter);
    }

    const items = filtered.map(ch => ({
      id: ch.id,
      name: ch.name,
      group: ch.group,
      logo: ch.logo || '',
      type: ch.type,
      source: ch.source,
      // url chỉ trả khi gọi resource=play để giảm lộ link hàng loạt
      hasStream: Boolean(ch.url)
    }));

    res.setHeader('Cache-Control', 'public, s-maxage=180, stale-while-revalidate=360');
    return res.status(200).json(ok({
      resource: 'channels',
      count: items.length,
      items
    }));
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({
      ok: false,
      error: error && error.message ? error.message : 'Live source unavailable',
      fetchedAt: new Date().toISOString()
    });
  }
};
