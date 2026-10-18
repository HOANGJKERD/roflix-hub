# RoTruyen: Truyện Việt adapter

RoTruyen integrates a small Node.js serverless adapter inspired by the parser implementations in
[hashi173/truyenviet.koplugin](https://github.com/hashi173/truyenviet.koplugin). The upstream project is a Lua plugin for KOReader, **not a REST API**. RoHub ports selected HTML parsing patterns rather than embedding the KOReader plugin itself.

## Initial sources

- TruyenFull: `https://truyenfull.live`
- Truyện Dịch: `https://truyendich.ai`

The first integration supports search/catalog listing, chapter listing, and plain-text chapter reading where the source HTML can be parsed. Source sites may rate-limit, change markup, or block server-side requests; in those cases RoTruyen shows an error and does not create sample stories. The adapter does not bypass access controls.

## API

- `GET /api/truyenviet?action=search&source=all&q=...`
- `GET /api/truyenviet?action=chapters&source=truyenfull&url=https%3A%2F%2Ftruyenfull.live%2F...`
- `GET /api/truyenviet?action=chapter&source=truyenfull&url=https%3A%2F%2Ftruyenfull.live%2F...&title=...`

Only the configured HTTPS hosts are accepted for upstream requests. The UI source selector includes **Truyện Việt · Truyện chữ**; choose it to load the catalog. Search for a term and press Enter to re-run the provider search.

## Scope and limitations

- This is a server-side HTML adapter, not an official API from either story website.
- The initial port includes two text sources only. Comic parsers from the upstream plugin have not yet been ported.
- Site markup and anti-bot protections can change; live availability must be tested after deployment.
- Upstream parser logic is licensed under MIT. The license is retained in `third_party/truyenviet.koplugin.LICENSE.md`.
- Integrating a parser does not grant rights to redistribute copyrighted stories. Respect each source's terms and applicable copyright rules.

## Upstream reference

- Repository and parser source: https://github.com/hashi173/truyenviet.koplugin
- Relevant upstream files: `truyenviet/sources/truyenfull.lua`, `truyenviet/sources/truyendich.lua`
