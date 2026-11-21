// Dedicated Vercel serverless proxy for the public NguonC catalog API.
// Kept independent from all anime metadata and playback providers.
const ORIGINS = ['https://phim.nguonc.com/api/', 'https://nguonc.com/api/'];
const PATH_OK = /^(?:films\/(?:phim-moi-cap-nhat|search|danh-sach\/[a-z0-9-]+|the-loai\/[a-z0-9-]+|quoc-gia\/[a-z0-9-]+|nam-phat-hanh\/\d{4}|ngon-ngu\/[a-z0-9-]+)|film\/[a-z0-9-]+)$/;

module.exports = async function nguoncHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const rawPath = String((req.query && req.query.path) || '');
  const path = rawPath.replace(/^\//, '');
  if (!PATH_OK.test(path)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ status: 'error', message: 'Path is not an allowed NguonC catalog route' });
  }

  const params = new URLSearchParams();
  for (const key of ['page', 'keyword', 'limit']) {
    const value = req.query && req.query[key];
    if (typeof value === 'string' && value.trim()) params.set(key, value.trim().slice(0, 120));
  }
  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    Referer: 'https://phim.nguonc.com/',
    Origin: 'https://phim.nguonc.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  };
  let lastStatus = 502;
  let lastBody = '';
  let lastType = 'application/json; charset=utf-8';
  for (const origin of ORIGINS) {
    const target = origin + path + (params.toString() ? '?' + params.toString() : '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const upstream = await fetch(target, { headers, signal: controller.signal });
      const body = await upstream.text();
      const type = upstream.headers.get('content-type') || '';
      const json = /json/i.test(type) || body.trim().startsWith('{') || body.trim().startsWith('[');
      if (upstream.ok && json) {
        res.setHeader('Content-Type', type || 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=180');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(body);
      }
      lastStatus = upstream.status;
      lastBody = body;
      lastType = type || lastType;
    } catch (error) {
      lastStatus = error && error.name === 'AbortError' ? 504 : 502;
      lastBody = JSON.stringify({ status: 'error', message: 'Could not reach NguonC API' });
      lastType = 'application/json; charset=utf-8';
    } finally {
      clearTimeout(timer);
    }
  }
  res.setHeader('Content-Type', /json/i.test(lastType) ? lastType : 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!/json/i.test(lastType) && !String(lastBody).trim().startsWith('{')) {
    return res.status(lastStatus === 403 ? 502 : lastStatus).json({ status: 'error', message: 'NguonC từ chối yêu cầu từ máy chủ. RoFlix sẽ thử kết nối trực tiếp từ trình duyệt.' });
  }
  return res.status(lastStatus).send(lastBody);
};

module.exports._test = { PATH_OK, ORIGINS };
