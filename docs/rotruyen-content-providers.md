# RoTruyen Content Provider Integration

## Current state

This branch adds a read-only provider registry at `GET /api/rotruyen-sources`.
It is additive: it does not change `index.html`, `roflix.html`, `rohub.html`,
existing MangaDex routes, or the current Supabase schema.

## Provider status

| Provider | Content | Status | Notes |
|---|---|---|---|
| RoTruyen Supabase catalog | Comics and text stories | Available when configured | First-party submissions remain canonical. |
| MangaDex | Manga/manhwa/webtoon | Configured | Existing proxy routes remain; verify Vietnamese chapter language per response. |
| Truyện Việt KOReader source parsers | Text novels and some comics | Reference only | Lua reader plugin, not REST API. Port and test individual parsers before enabling. |
| ShineiAPI | Manga/manhwa/webtoon | Not enabled | Public-host stability and Vietnamese chapter coverage are not verified; prefer self-hosting if tests pass. |

## API

- `GET /api/rotruyen-sources`: all providers.
- `GET /api/rotruyen-sources?type=novel`
- `GET /api/rotruyen-sources?type=light_novel`
- `GET /api/rotruyen-sources?type=web_novel`
- `GET /api/rotruyen-sources?type=comic`

This is a registry/diagnostic response, not a claim every listed provider is live. Check provider `state` before exposing it as a content source.

## Safe rollout

1. Verify the deployed Supabase project, tables, RLS and Storage bucket.
2. Smoke-test MangaDex catalog, Vietnamese chapter list, at-home page list, image proxy and rate-limit behavior.
3. Port one text provider at a time from a source parser, respecting source terms and copyright; normalize results into the common story/chapter schema.
4. Add per-provider timeouts, cache, rate limits, request validation and a disable switch.
5. Keep user state (favorites, progress, submissions) in Supabase. Store imported chapter bodies/images only where permission allows.
6. Connect new providers to the reader only after integration tests pass. Preserve the current database catalog and MangaDex behavior as fallback.

## Why text providers are not enabled yet

`hashi173/truyenviet.koplugin` is a useful reference for Vietnamese source parsers, but it is a KOReader Lua plugin, not a server API. Turning it into a stable API requires porting individual parsers and verifying source behavior, terms, chapter language and reader output. A generic untested scraper would risk availability and copyright problems.
