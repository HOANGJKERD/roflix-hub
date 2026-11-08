'use strict';

const LIVE_CURATED = [
  { id: 'vtv3hd', name: 'VTV3', group: 'FIFA WORLD CUP 2026', logo: 'https://i.ytimg.com/vi/4jr8Y13NSME/maxresdefault.jpg', url: 'http://42.1.99.192:8080/secureVhost/vtv3.flv?token=vtv_secret_20260706', type: 'flv', source: 'curated' },
  { id: 'vtv6hd', name: 'VTV6', group: 'FIFA WORLD CUP 2026', logo: 'https://raw.githubusercontent.com/vuminhthanh12/Logo/refs/heads/main/VTV6.png', url: 'http://42.1.99.192:8080/secureVhost/vtv6.flv?token=vtv_secret_20260706', type: 'flv', source: 'curated' },
  { id: 'vtv9hd', name: 'VTV9', group: 'FIFA WORLD CUP 2026', logo: 'https://i.ytimg.com/vi/APl10jiVAlQ/maxresdefault.jpg', url: 'http://42.1.99.192:8080/secureVhost/vtv9.flv?token=vtv_secret_20260706', type: 'flv', source: 'curated' },
  { id: 'vtv10hd', name: 'VTV10', group: 'FIFA WORLD CUP 2026', logo: 'https://raw.githubusercontent.com/vuminhthanh12/vuminhthanh12/refs/heads/main/VTV10.png', url: 'http://42.1.99.192:8080/secureVhost/vtv10.flv?token=vtv_secret_20260706', type: 'flv', source: 'curated' },
  { id: 'blcx', name: 'Bình Luận Cảm xúc', group: 'FIFA WORLD CUP 2026', logo: 'https://vtvgo-assets.vtvdigital.vn/assets/images/v2/channel/20260613/2026061323/TsjjtHjSSt-Logo-BLCX_3_11zon.webp', url: 'https://hoiquan.dpdns.org/VTVGo/?BinhLuanCamXuc', type: 'hls', source: 'curated' },
  { id: 'wc-fifa', name: 'Tín Hiệu Nguyên Bản', group: 'FIFA WORLD CUP 2026', logo: 'https://vtvgo-assets.vtvdigital.vn/assets/images/v2/channel/20260613/2026061323/FMxAbJrF0Q-Logo-NGUYENBAN_6_11zon.webp', url: 'https://hoiquan.dpdns.org/VTVGo/?WC-FiFa', type: 'hls', source: 'curated' },
  { id: 'wc-en-1', name: 'Kênh Tiếng Anh 1', group: 'FIFA WORLD CUP 2026', logo: 'https://vtvgo-assets.vtvdigital.vn/assets/images/v2/channel/20260617/2026061723/owe8ceyOCM-logo.webp', url: 'https://hoiquan.dpdns.org/VTVGo/?kenh-tieng-anh-1', type: 'hls', source: 'curated' },
  { id: 'ninochannel', name: 'Nino Channel', group: 'Sự Kiện', logo: 'https://raw.githubusercontent.com/vuminhthanh12/vuminhthanh12/refs/heads/main/ninochannel1.jpg', url: 'https://tpninosaga.duckdns.org/source/twitch.m3u8?channel=ninochannel12&token=NinoExility', type: 'hls', headers: { 'User-Agent': 'Mozilla/5.0' }, source: 'curated' },
  { id: 'user-hls-720p-001', name: 'Nguồn HLS thử nghiệm 720p', group: 'Nguồn do người dùng cung cấp', url: 'https://pzhgifbkllliv.vcdn.cloud/1794111437_hd/1794111437_hd@720p.m3u8', type: 'hls', source: 'user-provided', rightsStatus: 'unverified', status: 'untested' }
];

function str(value, fallback, max) {
  const v = typeof value === 'string' ? value.trim() : '';
  return (v || fallback || '').slice(0, max || 120);
}

function liveOk(payload) {
  return Object.assign({ ok: true, api: 'RoBong Unified API', version: '1.1.0', fetchedAt: new Date().toISOString() }, payload);
}

function handleLive(q) {
  const resource = str(q.resource, 'channels', 32).toLowerCase();
  const groupFilter = str(q.group, '', 80);
  const idFilter = str(q.id, '', 64);
  const channels = LIVE_CURATED.slice();

  if (resource === 'groups') {
    const groups = {};
    for (const ch of channels) {
      const g = ch.group || 'Khác';
      groups[g] = (groups[g] || 0) + 1;
    }
    const items = Object.keys(groups).sort().map(name => ({ name, count: groups[name] }));
    return { status: 200, cache: 300, body: liveOk({ resource: 'groups', count: items.length, items }) };
  }

  if (resource === 'play' || resource === 'channel') {
    const ch = channels.find(c => c.id === idFilter || c.name === idFilter);
    if (!ch) return { status: 404, cache: 0, body: { ok: false, error: 'Channel not found', id: idFilter } };
    return {
      status: 200,
      cache: 60,
      body: liveOk({
        resource: 'play',
        item: {
          id: ch.id, name: ch.name, group: ch.group, logo: ch.logo,
          url: ch.url, type: ch.type, headers: ch.headers || {}, source: ch.source, rightsStatus: ch.rightsStatus || 'unverified', status: ch.status || 'unknown'
        }
      })
    };
  }

  let filtered = channels;
  if (groupFilter) {
    const g = groupFilter.toLowerCase();
    filtered = channels.filter(c => (c.group || '').toLowerCase().includes(g));
  }
  if (idFilter) filtered = filtered.filter(c => c.id === idFilter || c.name === idFilter);
  const items = filtered.map(ch => ({
    id: ch.id, name: ch.name, group: ch.group, logo: ch.logo || '',
    type: ch.type, source: ch.source, rightsStatus: ch.rightsStatus || 'unverified', status: ch.status || 'unknown', hasStream: Boolean(ch.url)
  }));
  return { status: 200, cache: 180, body: liveOk({ resource: 'channels', count: items.length, items }) };
}

module.exports = { handleLive, LIVE_CURATED };
