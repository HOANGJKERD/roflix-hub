# RoTruyện Next.js migration workspace

This is an isolated migration workspace inside RoHub. It does **not** replace the current HTML/CSS/JavaScript RoTruyện entry point and is not production-ready yet.

## Stack

- Next.js 14 App Router
- React 18
- TypeScript in strict mode
- Supabase JS client dependency reserved for later integration

## Run locally

```bash
cd apps/rotruyen-next
npm install
npm run dev
```

Open `http://localhost:3000`.

## Migration rules

1. Keep the existing RoTruyện routes and public experience unchanged until parity is verified.
2. Move features in vertical slices: catalog/search/filter, manga detail and chapters, reader, guest/local library, authenticated cloud sync, community submissions, admin and published-theme runtime.
3. Reuse the existing MangaDex/API adapters only after mapping their contracts into typed server/client modules. Never invent demo titles as production catalog content.
4. Preserve the RoHub guest policy: public content stays readable without sign-in; only age-restricted content should require authentication/age gating according to the existing product rules.
5. Reuse existing Supabase tables only after verifying migrations and live schema. Never expose service-role credentials or private secrets in `NEXT_PUBLIC_*` variables.
6. Do not merge this workspace into the production branch or deploy it until build, type checks, data integration, route parity and access rules have been tested.

## Initial status

- [x] Isolated Next.js/React/TypeScript scaffold
- [x] Vietnamese responsive migration landing page
- [x] Typed MangaDex catalog adapter and server-side catalog endpoint
- [x] Real-data catalog, title search, genre filter and pagination
- [x] Manga detail page and Vietnamese chapter listing
- [x] Initial internal vertical chapter reader using MangaDex at-home image metadata
- [ ] Full parity with the old catalog sorting/ranking options
- [x] Reader previous/next navigation, language selector, per-image retry/error states, and local reading-position persistence\n- [ ] Reader pagination beyond the first 500 chapters and stronger language matching for very long series
- [ ] Favorites/history and cloud sync parity
- [ ] Community submissions/admin/theme runtime parity
- [ ] Automated checks and deployment review

## Reference

The separate [RoTruyen- / TruyenDex repository](https://github.com/HOANGJKERD/RoTruyen-) is a technical reference, not a drop-in replacement for RoHub's backend, data model, authentication or administration.
