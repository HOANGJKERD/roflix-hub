// Checks whether a movie file URL still exists. Returns only ok/status.
// It does not proxy or return the video.
const net = require('net');

function isPrivateHost(host) {
  const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  const version = net.isIP(h);
  if (version === 4) {
    const parts = h.split('.').map(Number);
    const a = parts[0];
    const b = parts[1];
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (version === 6) {
    if (h === '::' || h === '::1' || h.startsWith('::ffff:')) return true;
    if (/^(fc|fd)/.test(h) || /^fe[89ab]/.test(h)) return true;
  }
  return false;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  let target;
  try { target = new URL(String(req.query.u || '')); }
  catch (_) { return res.status(400).json({ ok: false, status: 0 }); }
  if (target.protocol !== 'https:' || target.username || target.password || isPrivateHost(target.hostname)) {
    return res.status(400).json({ ok: false, status: 0 });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(target.href, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Range: 'bytes=0-128',
        Referer: 'https://player.phimapi.com/'
      }
    });
    let finalHost = '';
    try { finalHost = new URL(response.url || target.href).hostname; } catch (_) {}
    if (isPrivateHost(finalHost)) return res.status(400).json({ ok: false, status: 0 });
    const type = response.headers.get('content-type') || '';
    const ok = response.ok && !/text\/html/i.test(type);
    try { if (response.body) response.body.cancel(); } catch (_) {}
    return res.status(200).json({ ok, status: response.status });
  } catch (_) {
    return res.status(200).json({ ok: false, status: 0 });
  } finally {
    clearTimeout(timer);
  }
};
