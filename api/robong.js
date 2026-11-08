// RoBong Unified API
// One public facade for verified no-key sports data providers.
// GET /api/robong?resource=providers
// GET /api/robong?sport=football&resource=leagues
// GET /api/robong?sport=football&resource=standings&league=eng.1&season=2026
// GET /api/robong?sport=football&resource=matches&league=bl1&season=2026
// GET /api/robong?sport=basketball&resource=matches
// GET /api/robong?sport=hockey&resource=standings
// GET /api/robong?sport=motorsport&resource=sessions&year=2025
// GET /api/robong?sport=esports&resource=providers
'use strict';

const FOOTBALL = 'https://api-football-standings.azharimm.site';
const OPENLIGA = 'https://api.openligadb.de';
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports';
const NHL = 'https://api-web.nhle.com/v1';
const OPENF1 = 'https://api.openf1.org/v1';
const TOURNAMENTS = 'https://tourneyradar-api.vercel.app';
const TIMEOUT_MS = 10000;

const PROVIDERS = [
  { id: 'football-standings', sport: 'football', auth: false, resources: ['leagues', 'standings'], note: 'ESPN-derived football league catalog and standings; no fixtures or player profiles.' },
  { id: 'openligadb', sport: 'football', auth: false, resources: ['leagues', 'matches', 'standings', 'teams'], note: 'Community-maintained results, fixtures and team data; strongest in German leagues and selected competitions.' },
  { id: 'espn-public', sport: 'football,basketball', auth: false, resources: ['matches', 'leagues', 'teams', 'players', 'standings'], note: 'Public ESPN site endpoints, undocumented and subject to change; not an official developer API.' },
  { id: 'nhl-public', sport: 'hockey', auth: false, resources: ['matches', 'standings', 'teams', 'players'], note: 'Public NHL web endpoints; coverage is ice hockey.' },
  { id: 'openf1', sport: 'motorsport', auth: false, resources: ['sessions', 'meetings', 'drivers', 'laps', 'pit', 'position', 'race_control', 'stints', 'intervals', 'starting_grid', 'car_data', 'location'], note: 'Historical F1 data from 2023 onward is free; real-time data requires a paid subscription.' },
  { id: 'tourney-radar', sport: 'chess', auth: false, resources: ['tournaments'], note: 'Chess tournament directory, not esports match data.' },
  { id: 'touchline-wire', sport: 'football', auth: false, resources: ['standings', 'teams', 'lineups', 'matches'], note: 'Premier League-only community API; requires visible attribution and should be treated as an experimental source until runtime checks pass.' }
];

const ALLOWED_OPENF1 = new Set(['sessions', 'meetings', 'drivers', 'laps', 'pit', 'position', 'race_control', 'stints', 'intervals', 'starting_grid', 'car_data', 'location']);
const ALLOWED_QUERY_KEYS = new Set(['year', 'session_key', 'meeting_key', 'driver_number', 'date_start', 'date_end', 'country_name', 'circuit_short_name', 'session_type', 'session_name', 'team_name', 'position', 'lap_number', 'speed', 'gear', 'tyre_age', 'compound', 'pit_duration', 'category', 'country', 'upcoming', 'fide_rated', 'limit', 'page']);

function str(value, fallback, max) {
  const v = typeof value === 'string' ? value.trim() : '';
  return (v || fallback || '').slice(0, max || 80);
}
function int(value, fallback, min, max) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}
function cleanLeague(value) {
  const v = str(value, '', 48);
  return /^[a-zA-Z0-9._-]+$/.test(v) ? v : '';
}
function cleanTeam(value) {
  const v = str(value, '', 32).toLowerCase();
  return /^[a-z0-9-]+$/.test(v) ? v : '';
}
function queryParams(source, allowed) {
  const out = new URLSearchParams();
  for (const key of allowed) {
    const value = source && source[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const v = String(value).trim().slice(0, 100);
      if (v) out.set(key, v);
    }
  }
  return out;
}
async function getJson(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: Object.assign({ Accept: 'application/json', 'User-Agent': 'RoBong-Unified-API/1.0 (+https://github.com/HOANGJKERD/roflix-hub)' }, options && options.headers),
      signal: controller.signal
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; }
    catch (_) { throw new Error('Upstream returned invalid JSON (' + response.status + ')'); }
    if (!response.ok) {
      const error = new Error('Upstream returned HTTP ' + response.status);
      error.status = response.status;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}
function removeBettingFields(value) {
  if (Array.isArray(value)) return value.map(removeBettingFields);
  if (!value || typeof value !== 'object') return value;
  const blocked = new Set(['odds', 'provider', 'providers', 'tickets', 'betting', 'moneyline', 'pointSpread', 'overUnder']);
  const clean = {};
  for (const [key, item] of Object.entries(value)) {
    if (!blocked.has(key)) clean[key] = removeBettingFields(item);
  }
  return clean;
}
function normalizeItems(data, sport, resource, provider) {
  let rows = [];
  if (resource === 'leagues') {
    const sources = Array.isArray(data) ? data : [];
    return sources.flatMap(source => {
      const list = Array.isArray(source.data) ? source.data : [];
      return list.map(row => ({
        id: String(row.id || row.leagueId || row.leagueShortcut || ''),
        name: row.name || row.leagueName || '',
        code: row.abbr || row.leagueShortcut || row.slug || '',
        season: row.season || row.leagueSeason || null,
        provider: source.provider || provider,
        sport: 'football'
      }));
    });
  }
  if (resource === 'matches') {
    if (Array.isArray(data)) rows = data;
    else if (Array.isArray(data && data.events)) rows = data.events;
    else if (Array.isArray(data && data.games)) rows = data.games;
    return rows.map(row => {
      if (row.team1 && row.team2) {
        const final = (row.matchResults || []).filter(x => x.resultTypeID === 2).slice(-1)[0] || (row.matchResults || []).slice(-1)[0];
        return { id: String(row.matchID || ''), home: row.team1.teamName || '', away: row.team2.teamName || '', homeScore: final ? final.pointsTeam1 : null, awayScore: final ? final.pointsTeam2 : null, status: row.matchIsFinished ? 'finished' : 'scheduled', startAt: row.matchDateTimeUTC || row.matchDateTime || null, competition: row.leagueName || '', source: provider };
      }
      if (row.competitions && row.competitions[0]) {
        const event = row.competitions[0], home = (event.competitors || []).find(x => x.homeAway === 'home'), away = (event.competitors || []).find(x => x.homeAway === 'away');
        const state = event.status && event.status.type && event.status.type.state || 'scheduled';
        const hasScore = state !== 'pre' && state !== 'scheduled';
        return { id: String(row.id || event.id || ''), home: home && home.team && home.team.displayName || '', away: away && away.team && away.team.displayName || '', homeScore: hasScore && home && home.score != null ? home.score : null, awayScore: hasScore && away && away.score != null ? away.score : null, status: state, startAt: event.date || row.date || null, competition: event.altGameNote || row.league && row.league.name || '', source: provider };
      }
      if (row.homeTeam && row.awayTeam) {
        const state = String(row.gameState || 'scheduled').toUpperCase(), hasScore = !['FUT','PRE','SCHEDULED'].includes(state);
        return { id: String(row.id || row.gameId || ''), home: row.homeTeam.abbrev || row.homeTeam.name || '', away: row.awayTeam.abbrev || row.awayTeam.name || '', homeScore: hasScore ? row.homeTeam.score ?? null : null, awayScore: hasScore ? row.awayTeam.score ?? null : null, status: state, startAt: row.startTimeUTC || row.gameDate || null, competition: 'NHL', source: provider };
      }
      return { id: String(row.session_key || row.meeting_key || ''), home: row.session_name || row.session_type || 'F1 session', away: row.circuit_short_name || row.country_name || '', homeScore: null, awayScore: null, status: 'session', startAt: row.date_start || null, competition: 'Formula 1', source: provider };
    });
  }
  if (['teams', 'players', 'roster', 'sessions', 'drivers', 'tournaments'].includes(resource)) {
    if (Array.isArray(data)) rows = data;
    else if (Array.isArray(data && data.data)) rows = data.data;
    else if (Array.isArray(data && data.athletes)) rows = data.athletes;
    else if (Array.isArray(data && data.items)) rows = data.items;
    else if (resource === 'players' || resource === 'roster') rows = ['forwards','defensemen','goalies'].flatMap(key => Array.isArray(data && data[key]) ? data[key] : []);
    return rows.map((row, index) => ({
      id: String(row.id || row.athleteId || row.teamId || row.session_key || row.key || index),
      name: row.fullName || row.displayName || row.name || row.teamName || row.session_name || row.competitor_name || row.athlete && row.athlete.displayName || 'Unknown',
      abbreviation: row.abbreviation || row.triCode || row.abbrev || row.shortName || '',
      position: row.position && (row.position.name || row.position.abbreviation) || '',
      country: row.country || row.country_name || '',
      startAt: row.date_start || row.startDate || row.start_time || null,
      source: provider
    }));
  }
  if (resource === 'standings') {
    const root = data && data.data || data;
    if (Array.isArray(root)) rows = root;
    else if (Array.isArray(root && root.standings)) rows = root.standings.flatMap(group => group.entries || []);
    else if (root && root.standings && Array.isArray(root.standings.entries)) rows = root.standings.entries;
    else if (Array.isArray(root && root.records)) rows = root.records;
    return rows.map((row, index) => {
      const stats = Array.isArray(row.stats) ? row.stats.reduce((acc, stat) => { acc[stat.name || stat.abbreviation] = stat.value; return acc; }, {}) : {};
      const team = row.team || row.teamInfo || {};
      return { rank: row.rank || row.position || index + 1, team: team.displayName || team.teamName || row.name || row.teamName || '', played: row.played ?? stats.gamesPlayed ?? stats.P ?? null, wins: row.won ?? stats.wins ?? stats.W ?? null, draws: row.drawn ?? stats.ties ?? stats.D ?? null, losses: row.lost ?? stats.losses ?? stats.L ?? null, points: row.points ?? stats.points ?? stats.PTS ?? null, goalDifference: row.goalDifference ?? stats.pointDifferential ?? stats.GD ?? null, source: provider };
    });
  }
  return [];
}
function ok(data, provider, sport, resource, cacheSeconds) {
  return { ok: true, sport, resource, provider, fetchedAt: new Date().toISOString(), cacheSeconds, items: normalizeItems(data, sport, resource, provider), data };
}
async function footballRequest(resource, q) {
  const league = cleanLeague(q.league);
  const season = int(q.season, new Date().getUTCFullYear(), 1900, 2200);
  if (resource === 'leagues') {
    const [standings, openliga] = await Promise.allSettled([
      getJson(FOOTBALL + '/leagues'),
      getJson(OPENLIGA + '/getavailableleagues')
    ]);
    const sources = [];
    if (standings.status === 'fulfilled') sources.push({ provider: 'football-standings', data: standings.value && standings.value.data || standings.value });
    if (openliga.status === 'fulfilled') sources.push({ provider: 'openligadb', data: openliga.value });
    if (!sources.length) throw new Error('All football league sources are unavailable');
    return ok(sources, 'football-standings+openligadb', 'football', resource, 3600);
  }
  if (resource === 'standings') {
    if (!league) throw new Error('Missing or invalid league. Use an ESPN league id such as eng.1 or an OpenLigaDB shortcut such as bl1.');
    if (league.includes('.')) {
      try {
        const data = await getJson(FOOTBALL + '/leagues/' + encodeURIComponent(league) + '/standings?season=' + season + '&sort=asc');
        return ok(data, 'football-standings', 'football', resource, 900);
      } catch (_) {
        const data = removeBettingFields(await getJson(ESPN + '/soccer/' + encodeURIComponent(league) + '/standings'));
        return ok(data, 'espn-public', 'football', resource, 900);
      }
    }
    const data = await getJson(OPENLIGA + '/getbltable/' + encodeURIComponent(league) + '/' + season);
    return ok(data, 'openligadb', 'football', resource, 900);
  }
  if (resource === 'matches') {
    if (league && !league.includes('.')) {
      let data = await getJson(OPENLIGA + '/getmatchdata/' + encodeURIComponent(league) + '/' + season);
      const range = str(q.date, '', 17).replace(/[^0-9-]/g, '');
      if (Array.isArray(data) && /^\\d{8}(?:-\\d{8})?$/.test(range)) {
        const parts = range.split('-'), from = parts[0], to = parts[1] || parts[0];
        data = data.filter(match => {
          const raw = match.matchDateTimeUTC || match.matchDateTime;
          if (!raw) return false;
          const day = new Date(raw).toISOString().slice(0, 10).replace(/-/g, '');
          return day >= from && day <= to;
        });
      }
      return ok(data, 'openligadb', 'football', resource, 120);
    }
    const competition = league || 'eng.1';
    const date = str(q.date, '', 17).replace(/[^0-9-]/g, '');
    const suffix = date ? '?dates=' + date : '';
    const data = removeBettingFields(await getJson(ESPN + '/soccer/' + encodeURIComponent(competition) + '/scoreboard' + suffix));
    return ok(data, 'espn-public', 'football', resource, 90);
  }
  if (resource === 'teams') {
    if (!league) throw new Error('The teams resource requires a league id or OpenLigaDB shortcut.');
    if (league.includes('.')) {
      const data = removeBettingFields(await getJson(ESPN + '/soccer/' + encodeURIComponent(league) + '/teams'));
      return ok(data, 'espn-public', 'football', resource, 3600);
    }
    const data = await getJson(OPENLIGA + '/getteams/' + encodeURIComponent(league) + '/' + season);
    return ok(data, 'openligadb', 'football', resource, 3600);
  }
  if (resource === 'players') {
    const teamId = str(q.team_id, '', 16);
    if (!/^\d+$/.test(teamId)) throw new Error('The players resource requires an ESPN team_id from the teams response.');
    const data = removeBettingFields(await getJson(ESPN + '/soccer/' + encodeURIComponent(league || 'eng.1') + '/teams/' + teamId + '/roster'));
    return ok(data, 'espn-public', 'football', resource, 1800);
  }
  if (resource === 'lineups') {
    const team = cleanTeam(q.team);
    if (!team) throw new Error('The lineups resource requires a Premier League club slug, for example arsenal.');
    const data = await getJson('https://touchlinewire.com/api/v1/lineups/' + encodeURIComponent(team));
    return ok(data, 'touchline-wire', 'football', resource, 300);
  }
  throw new Error('Unsupported football resource');
}

async function espnRequest(sport, resource, q) {
  const leagueMap = { basketball: 'nba', football: 'eng.1' };
  const league = cleanLeague(q.league) || leagueMap[sport];
  const category = sport === 'basketball' ? 'basketball' : 'soccer';
  if (resource === 'matches') {
    const date = str(q.date, '', 8).replace(/[^0-9]/g, '');
    const data = removeBettingFields(await getJson(ESPN + '/' + category + '/' + encodeURIComponent(league) + '/scoreboard' + (date ? '?dates=' + date : '')));
    return ok(data, 'espn-public', sport, resource, 90);
  }
  if (resource === 'leagues' || resource === 'standings') {
    const data = removeBettingFields(await getJson(ESPN + '/' + category + '/' + encodeURIComponent(league) + '/standings'));
    return ok(data, 'espn-public', sport, resource, 900);
  }
  if (resource === 'teams') {
    const data = removeBettingFields(await getJson(ESPN + '/' + category + '/' + encodeURIComponent(league) + '/teams'));
    return ok(data, 'espn-public', sport, resource, 3600);
  }
  if (resource === 'players') {
    const teamId = str(q.team_id, '', 16);
    if (!/^\d+$/.test(teamId)) throw new Error('The players resource requires a team_id from the teams response.');
    const data = removeBettingFields(await getJson(ESPN + '/' + category + '/' + encodeURIComponent(league) + '/teams/' + teamId + '/roster'));
    return ok(data, 'espn-public', sport, resource, 1800);
  }
  throw new Error('Unsupported ESPN resource');
}

async function hockeyRequest(resource, q) {
  if (resource === 'standings') return ok(await getJson(NHL + '/standings/now'), 'nhl-public', 'hockey', resource, 600);
  if (resource === 'matches') return ok(await getJson(NHL + '/score/now'), 'nhl-public', 'hockey', resource, 90);
  if (resource === 'teams') return ok(await getJson('https://api.nhle.com/stats/rest/en/team'), 'nhl-public', 'hockey', resource, 3600);
  if (resource === 'roster' || resource === 'players') {
    const team = str(q.team, '', 3).toUpperCase();
    if (!/^[A-Z]{3}$/.test(team)) throw new Error('Roster requires a 3-letter NHL team code, for example TOR.');
    return ok(await getJson(NHL + '/roster/' + encodeURIComponent(team) + '/current'), 'nhl-public', 'hockey', resource, 1800);
  }
  throw new Error('Unsupported hockey resource');
}

async function f1Request(resource, q) {
  if (!ALLOWED_OPENF1.has(resource)) throw new Error('Unsupported OpenF1 resource');
  const params = queryParams(q, ALLOWED_QUERY_KEYS);
  if (q.year) params.set('year', String(int(q.year, new Date().getUTCFullYear(), 2023, 2200)));
  if (!params.has('session_key') && !params.has('meeting_key')) {
    if (resource === 'sessions' || resource === 'meetings') {
      if (!params.has('year')) params.set('year', String(new Date().getUTCFullYear()));
    } else {
      params.set('session_key', 'latest');
    }
  }
  const data = await getJson(OPENF1 + '/' + resource + (params.toString() ? '?' + params.toString() : ''));
  return ok(data, 'openf1', 'motorsport', resource, 1800);
}

async function chessRequest(resource, q) {
  if (resource !== 'tournaments') throw new Error('Unsupported chess resource');
  const params = queryParams(q, ['country', 'category', 'upcoming', 'fide_rated', 'limit', 'page']);
  if (!params.has('limit')) params.set('limit', '50');
  const data = await getJson(TOURNAMENTS + '/v1/tournaments' + (params.toString() ? '?' + params.toString() : ''));
  return ok(data, 'tourney-radar', 'chess', resource, 3600);
}

module.exports = async function robongUnifiedApi(req, res) {
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
  const sport = str(q.sport, 'football', 24).toLowerCase();
  const resource = str(q.resource, 'providers', 32).toLowerCase();
  if (resource === 'providers') {
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ ok: true, api: 'RoBong Unified API', version: '1.0.0', authRequired: false, providers: PROVIDERS, unsupported: [
      { sport: 'esports', reason: 'Chưa tìm được nguồn dữ liệu esports đủ tin cậy, không cần tài khoản/API key và có điều khoản sử dụng rõ ràng.' },
      { sport: 'tennis, volleyball', reason: 'Chưa có nhà cung cấp no-key đủ ổn định để cam kết lịch, tỷ số, bảng xếp hạng và hồ sơ vận động viên.' },
      { sport: 'basketball player statistics', reason: 'BALLDONTLIE hiện yêu cầu tài khoản và API key; không nằm trong cấu hình no-key.' }
    ] });
  }

  try {
    let result;
    if (sport === 'football') result = await footballRequest(resource, q);
    else if (sport === 'basketball') result = await espnRequest(sport, resource, q);
    else if (sport === 'hockey') result = await hockeyRequest(resource, q);
    else if (sport === 'motorsport') result = await f1Request(resource, q);
    else if (sport === 'chess') result = await chessRequest(resource, q);
    else throw new Error('No verified no-key provider is currently configured for sport: ' + sport);

    const seconds = Math.max(30, Math.min(3600, Number(result.cacheSeconds) || 120));
    res.setHeader('Cache-Control', 'public, s-maxage=' + seconds + ', stale-while-revalidate=' + (seconds * 2));
    res.setHeader('Vary', 'Accept');
    return res.status(200).json(result);
  } catch (error) {
    const status = error && error.status === 429 ? 503 : 502;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(status).json({
      ok: false,
      sport,
      resource,
      error: error && error.message ? error.message : 'Sports data provider is unavailable',
      fetchedAt: new Date().toISOString(),
      note: 'RoBong không tự tạo dữ liệu thay thế khi nguồn không phản hồi.'
    });
  }
};

module.exports._test = { PROVIDERS, cleanLeague, cleanTeam, queryParams, ALLOWED_OPENF1 };
