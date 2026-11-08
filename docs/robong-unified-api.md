# RoBong Unified API

RoBong exposes one backend gateway at:

`GET /api/robong`

The browser calls this endpoint only. The server chooses the configured public provider, normalizes supported records into `items`, and preserves the original provider payload in `data`.

## Common response

```json
{
  "ok": true,
  "sport": "football",
  "resource": "matches",
  "provider": "espn-public",
  "fetchedAt": "2026-11-08T00:00:00.000Z",
  "cacheSeconds": 90,
  "items": [
    {
      "id": "event-id",
      "home": "Home team",
      "away": "Away team",
      "homeScore": null,
      "awayScore": null,
      "status": "pre",
      "startAt": "2026-11-08T18:00:00Z",
      "competition": "League",
      "source": "espn-public"
    }
  ],
  "data": {}
}
```

`items` is the normalized cross-provider view. `data` is the upstream response for details not represented by the shared schema. An unavailable source returns `ok: false`; RoBong does not fabricate scores or lineups.

## Routes

| Query | Purpose |
|---|---|
| `?resource=providers` | Provider registry and known coverage gaps |
| `?sport=football&resource=leagues` | Football league catalog from Football Standings + OpenLigaDB |
| `?sport=football&resource=standings&league=eng.1&season=2026` | ESPN-derived football standings |
| `?sport=football&resource=standings&league=bl1&season=2026` | OpenLigaDB standings |
| `?sport=football&resource=matches&league=eng.1&date=20261108` | ESPN public football scoreboard |
| `?sport=football&resource=matches&league=bl1&season=2026` | OpenLigaDB match schedule/results |
| `?sport=football&resource=teams&league=eng.1` | Football teams |
| `?sport=football&resource=players&league=eng.1&team_id=359` | Team roster from ESPN |
| `?sport=football&resource=lineups&team=arsenal` | Experimental Premier League predicted lineup |
| `?sport=basketball&resource=matches&league=nba` | ESPN public NBA scoreboard |
| `?sport=basketball&resource=standings&league=nba` | ESPN public NBA standings |
| `?sport=basketball&resource=teams&league=nba` | NBA team catalog |
| `?sport=basketball&resource=players&league=nba&team_id=13` | NBA team roster |
| `?sport=hockey&resource=matches` | NHL scoreboard |
| `?sport=hockey&resource=standings` | NHL standings |
| `?sport=hockey&resource=teams` | NHL teams |
| `?sport=hockey&resource=players&team=TOR` | NHL roster |
| `?sport=motorsport&resource=sessions&year=2026` | OpenF1 historical sessions |
| `?sport=motorsport&resource=drivers&session_key=latest` | OpenF1 driver records |
| `?sport=chess&resource=tournaments&limit=30` | Chess tournament directory |

## Providers and limitations

- **Football Standings API**: no API key; league directory and standings. The project says its data is based on ESPN.
- **OpenLigaDB**: no API key; fixtures, results, teams and tables for supported leagues. Community-maintained, strongest in German competitions.
- **ESPN public site endpoints**: no API key for current observed endpoints; undocumented developer interface, may change without notice. Betting-related fields are removed before returning the data.
- **NHL public endpoints**: no API key; ice hockey scoreboard, standings, teams and rosters.
- **OpenF1**: no API key for historical data from 2023 onward. Real-time data requires a paid subscription, so this integration does not claim live telemetry.
- **Touchline Wire**: experimental Premier League tactical source. It asks for visible attribution and should be treated as provisional until its endpoint reliability is monitored.
- **TourneyRadar**: no API key for chess tournament listings. It is not an esports results provider.

## Not included in the no-key profile

- BALLDONTLIE currently requires account creation and an API key.
- ScoreBat currently requires an API token even though it offers a free-feed tier.
- QiuXiaoCe requires an `X-API-Key`.
- TheSportsDB is marked as requiring an API key in the community API directory.
- No dependable no-key source has been validated for broad esports results, tennis or volleyball player/league statistics, or official starting lineups.

## Operational safeguards

- One same-origin Vercel serverless route keeps provider selection out of the browser.
- Provider calls have a 10-second timeout.
- Responses use provider-specific CDN cache lifetimes and stale-while-revalidate.
- Query values are bounded and provider paths are allow-listed.
- Upstream errors are surfaced as errors, not replaced with invented content.
- No API secrets are required for the configured no-key profile.
