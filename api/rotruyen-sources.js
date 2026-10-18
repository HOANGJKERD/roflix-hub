'use strict';

/**
 * RoTruyen provider registry and diagnostics.
 * This endpoint does not scrape third-party story websites.
 * Provider availability and redistribution rights must be verified before enabling a provider.
 *
 * GET /api/rotruyen-sources
 * GET /api/rotruyen-sources?type=novel|comic|all
 */
const PROVIDERS = [
  { id: 'rotruyen-db', label: 'Thư viện RoTruyện', types: ['novel', 'light_novel', 'web_novel', 'comic'], mode: 'supabase', state: 'available', api: 'Supabase tables rotruyen_series / rotruyen_chapters', languages: ['vi'], notes: 'Nội dung do admin hoặc thành viên gửi và được duyệt; phụ thuộc schema/RLS của Supabase đang cấu hình.' },
  { id: 'mangadex', label: 'MangaDex', types: ['comic'], mode: 'rest', state: 'configured', api: 'https://api.mangadex.org', languages: ['vi'], notes: 'RoTruyen đã có proxy catalog/chapter/ảnh. Chỉ hiển thị chương có ngôn ngữ vi khi API cung cấp metadata đó.' },
  { id: 'truyenviet-adapters', label: 'Nguồn truyện chữ Việt (adapter cần triển khai)', types: ['novel', 'light_novel', 'web_novel'], mode: 'adapter-required', state: 'not_enabled', api: null, languages: ['vi'], notes: 'Chưa bật scraper nào trong production. Truyện Việt KOReader là tài liệu tham khảo, không phải REST API; cần kiểm tra điều khoản từng website.' },
  { id: 'shineiapi', label: 'ShineiAPI', types: ['comic'], mode: 'external-rest', state: 'not_enabled', api: 'https://shineiapi.vercel.app/api/v1', languages: [], notes: 'Chưa bật: host công khai có thể tạm ngừng và chưa xác minh đủ chương tiếng Việt. Chỉ bật sau khi tự host/kiểm thử.' }
];

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }
  const url = new URL(req.url, 'https://rohub.invalid');
  const type = (url.searchParams.get('type') || 'all').toLowerCase();
  const validTypes = new Set(['all', 'novel', 'light_novel', 'web_novel', 'comic']);
  if (!validTypes.has(type)) return json(res, 400, { error: 'Invalid type', allowed: Array.from(validTypes) });
  const providers = PROVIDERS.filter((provider) => type === 'all' || provider.types.includes(type));
  return json(res, 200, {
    service: 'RoTruyen Content Providers',
    version: 1,
    type,
    generatedAt: new Date().toISOString(),
    policy: { noThirdPartyScrapingByDefault: true, productionContentMustBeAuthorized: true, sourceAvailabilityIsNotGuaranteed: true },
    providers
  });
};
