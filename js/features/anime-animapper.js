/* RoFlix Anime AniMapper provider
 * AniMapper supplies anime streaming through its documented ANIMEVIETSUB provider.
 * This adapter is additive: normal movie APIs/player stay untouched.
 * Docs: https://animapper.net/docs/tutorial
 */
(function () {
  'use strict';
  if (window.__ROFLIX_ANIMAPPER__) return;
  window.__ROFLIX_ANIMAPPER__ = true;

  const BASE = 'https://api.animapper.net/api/v1';
  const PROVIDER = 'ANIMEVIETSUB';
  const DEFAULT_SERVER = 'DU';
  const cache = new Map();
  let wrapped = false;

  function text(v) { return String(v == null ? '' : v).trim(); }
  function norm(v) {
    return text(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function titleVariants(anime) {
    const t = anime?.title || {};
    return [...new Set([t.userPreferred, t.english, t.romaji, t.native]
      .map(text).filter(Boolean))];
  }
  function json(url, ttl = 60000) {
    const hit = cache.get(url);
    if (hit && hit.expires > Date.now()) return hit.promise;
    const promise = fetch(url, { headers: { Accept: 'application/json' } })
      .then(async r => {
        if (!r.ok) throw new Error('AniMapper HTTP ' + r.status);
        const data = await r.json();
        if (data?.success === false) throw new Error(data.message || 'AniMapper request failed');
        return data;
      });
    cache.set(url, { promise, expires: Date.now() + ttl });
    return promise.catch(err => { cache.delete(url); throw err; });
  }
  function unwrapResults(data) {
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.result)) return data.result;
    if (Array.isArray(data?.data?.results)) return data.data.results;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }
  function unwrapEpisodes(data) {
    if (Array.isArray(data?.episodes)) return data.episodes;
    if (Array.isArray(data?.result?.episodes)) return data.result.episodes;
    if (Array.isArray(data?.data?.episodes)) return data.data.episodes;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }
  function episodeId(ep) {
    return text(ep?.episodeId || ep?.id || ep?.episodeData || ep?.data);
  }
  function sourceUrl(data) {
    const root = data?.result || data?.data || data;
    const candidates = [
      root?.url,
      root?.streamUrl,
      root?.streamingUrl,
      root?.source?.url,
      root?.sources?.[0]?.url,
      root?.sources?.[0]?.file,
      root?.links?.[0]?.url,
      root?.links?.[0]?.file
    ];
    return candidates.map(text).find(Boolean) || '';
  }
  function scoreMatch(anime, item) {
    const wanted = titleVariants(anime).map(norm).filter(Boolean);
    const got = norm(item?.title || item?.name || item?.english || item?.romaji || item?.slug);
    if (!got) return -1;
    let score = 0;
    wanted.forEach(w => {
      if (w === got) score = Math.max(score, 100);
      else if (got.includes(w) || w.includes(got)) score = Math.max(score, 88);
      else {
        const a = new Set(w.split(' ').filter(x => x.length > 1));
        const b = new Set(got.split(' '));
        let common = 0;
        a.forEach(x => { if (b.has(x)) common++; });
        score = Math.max(score, Math.min(75, common * 15));
      }
    });
    const year = Number(anime?.seasonYear || anime?.startDate?.year || 0);
    const itemYear = Number(item?.year || item?.releaseYear || 0);
    if (year && itemYear) {
      if (year === itemYear) score += 15;
      else if (Math.abs(year - itemYear) === 1) score += 7;
      else if (Math.abs(year - itemYear) > 3) score -= 15;
    }
    return score;
  }
  async function findMedia(anime) {
    const titles = titleVariants(anime).slice(0, 4);
    const hits = [];
    for (const title of titles) {
      const url = `${BASE}/search?title=${encodeURIComponent(title)}&mediaType=ANIME&limit=10`;
      const data = await json(url, 5 * 60 * 1000);
      unwrapResults(data).forEach(item => hits.push(item));
      const ranked = hits.map(item => ({ item, score: scoreMatch(anime, item) }))
        .sort((a, b) => b.score - a.score);
      if (ranked[0]?.score >= 100) return ranked[0].item;
    }
    return hits.map(item => ({ item, score: scoreMatch(anime, item) }))
      .sort((a, b) => b.score - a.score)[0]?.item || null;
  }
  async function resolve(anime) {
    const media = await findMedia(anime);
    if (!media?.id) throw new Error('AniMapper không tìm thấy Anime này.');

    const metadata = await json(`${BASE}/metadata?id=${encodeURIComponent(media.id)}`, 10 * 60 * 1000);
    const providers = metadata?.result?.streamingProviders || metadata?.data?.streamingProviders || {};
    const hasVietsub = Object.keys(providers).some(k => k.toUpperCase() === PROVIDER);
    if (!hasVietsub) throw new Error('Anime này chưa có provider ANIMEVIETSUB trên AniMapper.');

    const epsData = await json(`${BASE}/stream/episodes?id=${encodeURIComponent(media.id)}&provider=${PROVIDER}`, 5 * 60 * 1000);
    const episodes = unwrapEpisodes(epsData).map((ep, index) => ({
      name: text(ep?.number || ep?.episodeNumber || ep?.title || ep?.name || (index + 1)),
      episodeId: episodeId(ep)
    })).filter(ep => ep.episodeId);
    if (!episodes.length) throw new Error('AniMapper không trả về tập Vietsub.');
    return { media, metadata, episodes };
  }
  async function getSource(episodeData, server = DEFAULT_SERVER) {
    const url = `${BASE}/stream/source?episodeData=${encodeURIComponent(episodeData)}&provider=${PROVIDER}&server=${encodeURIComponent(server)}`;
    const data = await json(url, 30000);
    const stream = sourceUrl(data);
    if (!stream) throw new Error('AniMapper không trả về URL stream.');
    return { url: stream, raw: data };
  }
  function notify(type, title, message) {
    if (typeof showToastPro === 'function') showToastPro(type, title, message);
    else if (typeof showToast === 'function') showToast(type, title, message);
  }
  async function play(anime) {
    const resolved = await resolve(anime);
    const first = resolved.episodes[0];
    const source = await getSource(first.episodeId);
    const title = text(anime?.title?.userPreferred || anime?.title?.english || anime?.title?.romaji || resolved.media?.title || 'Anime');
    if (typeof playMovieByLink !== 'function') throw new Error('RoFlix player chưa sẵn sàng.');
    currentSlug = 'animapper-' + resolved.media.id;
    currentSourceId = 'animapper';
    currentMovieTitle = title;
    currentMovieData = { title, origin_name: '', summary: anime?.description || '', _src: 'animapper', poster: anime?.coverImage?.large || '' };
    currentEpisodeList = resolved.episodes.map(ep => ({ name: ep.name, link: '' }));
    currentEpisodeList[0].link = source.url;
    playMovieByLink(source.url, title, first.name);

    // Keep all AniMapper episode IDs so the existing episode UI can request each stream lazily.
    window.__ROFLIX_ANIMAPPER_STATE__ = {
      anime, resolved, title,
      async playEpisode(index) {
        const ep = resolved.episodes[index];
        if (!ep) return;
        notify('info', 'AniMapper', `Đang tải Tập ${ep.name} Vietsub...`);
        const next = await getSource(ep.episodeId);
        currentEpisodeList[index] = { name: ep.name, link: next.url };
        if (typeof playMovieByLink === 'function') playMovieByLink(next.url, title, ep.name);
      }
    };
    notify('success', 'Anime Vietsub', `Đã kết nối AniMapper • ${resolved.episodes.length} tập`);
  }
  async function wrappedWatch(anime, fallback) {
    try {
      notify('info', 'Anime Vietsub', 'Đang tìm nguồn AniMapper...');
      await play(anime);
    } catch (err) {
      console.warn('[RoFlix AniMapper]', err);
      if (typeof fallback === 'function') return fallback(anime);
      notify('warning', 'Không có nguồn Vietsub', err.message || 'AniMapper không có nguồn phù hợp.');
    }
  }
  function install() {
    if (wrapped || !window.roflixAnime?.watch) return false;
    const original = window.roflixAnime.watch;
    window.roflixAnime.watch = anime => wrappedWatch(anime, original);
    window.roflixAnime.animapper = { resolve, getSource, play };
    wrapped = true;
    return true;
  }
  function boot() {
    if (install()) return;
    setTimeout(install, 300);
    setTimeout(install, 1200);
    setTimeout(install, 2500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
