# RoFlix HUB - Grok Audit Report

Date: 2026-10-06  
Repository: HOANGJKERD/roflix-hub  
Branch: main  

## 1. Summary

Stabilization pass only. No new product features.

Game economy is now server-authoritative for `roflix_game_stats` writes. Comments 2.0 uses one canonical table (`roflix_movie_comments`) for read/write/realtime/admin. API pagination is committed once after a source is chosen. Cloud sync listeners no longer fire on `TOKEN_REFRESHED`.

Supabase migrations in this pass are **in GitHub only**. They were **not applied** to the live project from this environment.

## 2. Game Economy Security

### Problems found

- `roflix_award_watch` trusted `p_minutes` and `p_episode`, and per-slug cooldown could be rotated.
- `roflix_user_adjust_gem` could be re-granted by historical SQL (`mega_upgrade.sql`, `cloud_account_gacha_sync.sql`).
- Leftover INSERT/UPDATE RLS policies on `roflix_game_stats` / `roflix_gacha_inventory`.
- Dual gem wallet: `profiles.gems` still writable if that column exists.
- Client Gacha wrappers showed locally rolled cards while the server rolled different cards.
- Daily quest / comment / favorite still mint **local** gems (anonymous UX only).

### Fixes

- New migration `supabase/migrations/20261006120000_harden_game_economy_server_authority.sql`
  - `roflix_award_watch` always awards 1 minute, ignores episode flag, 60s global cooldown, unique `(user_id, claim_bucket)`.
  - `roflix_user_adjust_gem` returns current gems and does not mutate.
  - `roflix_sync_game_state` still ignores client progression fields.
  - Legacy `gacha_commit` / `gacha_commit_batch` remain as wrappers over `roflix_gacha_roll`.
  - `gacha_merge` remains a no-op.
  - Profile `gems` frozen for non-admin updates when the column exists.
- `js/app/41-window-onload.js` no longer shows client-rolled cards; uses `roflix_gacha_roll` / `rfServerGachaPull`.

### RPC changes

Kept names: `roflix_award_watch`, `roflix_sync_game_state`, `roflix_user_adjust_gem`, `roflix_gacha_commit`, `roflix_gacha_commit_batch`, `roflix_gacha_merge`.

### RLS changes

Revoke write on game stats / gacha inventory. Drop leftover write policies.

### Remaining risks

- Watch reward is still a client-triggered RPC. A signed-in user can claim 1 minute per minute up to 240/day without proving playback.
- `roflix_gacha_roll` body is **not in this repo**. Cannot verify cost/pity server-side from git.
- Anonymous localStorage gems/exp/gacha still exist for offline UI.
- Re-running historical `mega_upgrade.sql` / `cloud_account_gacha_sync.sql` would undo parts of the lockdown.

## 3. Comments 2.0

### Schema

Canonical table: `public.roflix_movie_comments`  
Author fields: `username` and `display_name` (kept in sync).  
Status: in-row `status` plus `roflix_movie_comment_moderation`.  
Threads: `parent_id`.  
Create/like/admin hide-delete go through RPCs.

Legacy `movie_comments` is **not dropped**.

### Realtime

Publication added for `roflix_movie_comments`. Client channels and admin channels retargeted.

### RLS

Public/authenticated can read visible rows. Insert requires `user_id = auth.uid()`. Create RPC forces `auth.uid()` and profile display name.

### Thread / Reaction / Moderation

- Detail renderer: `rfRenderCommentThread2` when present.
- Player list: `movie-comments-cloud.js` (`#rf-player-comments-list`).
- Admin moderation: `roflix_admin_movie_comment_status` / `roflix_admin_movie_comment_delete`.
- Hidden rows filtered in public readers.

### Remaining risks

- Multiple comment renderers still exist; they now share the same table/RPC but can still race-paint the same DOM node.
- `07-b-nh-lu-n.js` localStorage path remains as last-resort fallback (no gem reward).
- `community_comments` is a different feature and was left alone.

## 4. API Pagination

### Old architecture

`fetchMoviesFromSource` / `fetchHomePriorityMovies` wrote `currentPage` / `totalPages` / `totalItems` inside source loops, including for results that were then discarded. Overlapping `renderMoviesFromAPI` calls last-write-wins.

### New architecture

Each source returns `{ source, movies, pagination }`.  
`applyListPagination()` runs once after the winning source is chosen.  
`renderMoviesFromAPI` uses `listFetchGen` to ignore stale responses.  
Empty results reset pager.

Fallback policy is unchanged: KKPhim first, VSMOV last. Sources are not merged into one page.

### Compatibility

Search, genre, country, list endpoint, source switch, cache, `_src`, `fetchListWithFallback` contract unchanged.

### Remaining risks

- Home mix still uses `max(auPages, krPages)` and summed `totalItems`.
- Favorites still calls `fetchMovies(1)` and can pollute pager globals.
- Hidden-movie filter can empty a page without shrinking `totalPages`.

## 5. Cloud Sync

### Old architecture

Several modules hydrated independently and listened to `TOKEN_REFRESHED`, causing duplicate RPC storms. `saveWatchHistory` wrappers stacked. Gacha wrappers fought.

### New architecture

No module deleted.

- Canonical favs/history wrappers: `cloud-user-data.js`
- Snapshot dispatcher: `rfCloudSync2` in `roflix-all-features-2.js`
- UI cache apply: `cloud-hydrate-2.js` (listener only, extra boot pull removed)
- Auth hydrates only on `SIGNED_IN` / `SIGNED_OUT`
- Duplicate wrap skipped when `__rfCloudWrapped` is set
- Gacha owner remains `rfServerGachaPull` / `roflix_gacha_roll`

### Modules changed

`cloud-user-data.js`, `cloud-hydrate-2.js`, `roflix-all-features-2.js`, `roflix-production.js`, `roflix-mega-upgrade.js`, `41-window-onload.js`

### Remaining risks

- `roflix_cloud_snapshot` is still called and **not defined in repo SQL**. If missing live, Cloud 2 pull is a silent no-op.
- Favorites merge-by-union can resurrect deleted items.
- Guest `roflix-favs` can leak into the next login on the same browser.
- 8s poll in `js/config/tailwind.config.js` remains.

## 6. Database Migrations

| File | Purpose | Applied |
|---|---|---|
| `supabase/migrations/20261006120000_harden_game_economy_server_authority.sql` | Server-authoritative gems/exp/gacha wrappers, watch-reward cooldown | **Not applied** from this environment |
| `supabase/migrations/20261006120100_unify_comments_2_contract.sql` | Canonical comments table, RLS, create/like/admin RPCs, realtime | **Not applied** from this environment |

Run both in Supabase SQL Editor (or `supabase db push`) before treating comments/admin hide as production-correct.

## 7. Tests

### PASS

- `node --check` on edited JS files
- Repo grep: no `from('movie_comments')` writers left
- Repo grep: fake comment `RoFlix Fan / Phim hay quá!` removed from runtime JS
- Repo grep: no service-role / `sb_secret` keys added

### FAIL

- none observed in static checks

### NOT TESTED

- anonymous / authenticated / admin browser flows
- live Gacha pull / sell
- live watch reward
- comment create / reply / like / edit / delete / realtime / moderation against live DB
- home / search / genre / country / pagination / source switch in a browser
- cloud load/save/logout/login against live DB
- applying the two new SQL migrations

Do not treat this as production-ready until those migrations are applied and the NOT TESTED items are run.

## 8. Files Changed

See git commits listed in the handoff.

## 9. Breaking Changes

- Client can no longer mint gems through `roflix_user_adjust_gem`.
- Client-supplied Gacha cards are ignored; UI should show server results.
- Comment create requires login and RPC `roflix_movie_comment_create`.
- Admin comment hide/delete requires the new admin RPCs (fail until migration is applied).

## 10. Remaining Risks

See sections 2–5. Highest:

1. Watch reward without playback proof.
2. `roflix_gacha_roll` not in git.
3. Migrations not applied to live Supabase.
4. Cloud snapshot RPC missing from git.
5. Local anonymous economy still cosmetic-writable.
