# RoFlix HUB - ChatGPT Audit 2026-10-05

## Scope

Review tiếp phần Grok chưa kịp hoàn thành sau commit game-state hardening. Tập trung vào Game Economy, Comments 2.0, API pagination và Cloud Sync.

## Completed in this pass

### 1. Game Economy

- Giữ nguyên server-authoritative `roflix_sync_game_state()` từ Grok.
- Phát hiện `roflix_award_watch()` vẫn tin `p_minutes` do client gửi và có thể bị replay/spam.
- Thêm `roflix_watch_reward_claims` để server kiểm soát reward claim.
- Giới hạn reward mỗi request tối đa 15 phút.
- Giới hạn tổng watch reward 240 phút/ngày/user.
- Thêm cooldown 5 phút cho cùng movie slug.
- Phát hiện các RPC Gacha legacy nhận card/cost do client cung cấp.
- `roflix_gacha_commit()` và `roflix_gacha_commit_batch()` hiện route sang `roflix_gacha_roll()` để card và cost được quyết định server-side.
- `roflix_gacha_merge()` không còn mint inventory từ payload client.

### 2. Comments 2.0

- Xác nhận `roflix_movie_comments` là bảng canonical cho movie comments realtime.
- Phát hiện `movie-comments-cloud.js` đang đọc/ghi `movie_comments`, trong khi schema hiện tại của `movie_comments` không khớp contract movie comment.
- Sửa `movie-comments-cloud.js` sang `roflix_movie_comments` và dùng `username`.
- Phát hiện `comments-realtime.js` còn fallback sang localStorage và fake sample comment `RoFlix Fan / Phim hay quá!`.
- Loại bỏ fake comment và local fallback khỏi realtime movie comments.
- Supabase hiện vẫn có các bảng `community_comments`, `movie_comments`, `roflix_movie_comments`, nhưng chúng có mục đích khác nhau; chưa xóa bảng nào để tránh phá dữ liệu.

### 3. API Pagination

- Sửa `js/app/01-h-m-g-i-api.js` để provider adapter không trực tiếp mutate `currentPage`, `totalPages`, `totalItems`.
- Pagination metadata được gắn vào result của provider, sau đó tầng `fetchMovies()` mới cập nhật UI state.
- Home priority vẫn giữ logic pagination riêng vì đây là endpoint tổng hợp đặc biệt.

### 4. Cloud Sync

- Đã audit cấu trúc và xác nhận vẫn tồn tại nhiều module cloud (`cloud-center.js`, `cloud-hydrate-2.js`, `cloud-user-data.js`).
- Chưa xóa module nào vì cần trace toàn bộ script loading/callers trước khi consolidation.
- Đây là remaining architecture task, chưa coi là hoàn thành.

## Supabase

Migration applied:

`20261005114101_harden_game_rewards_and_legacy_gacha`

GitHub migration file:

`supabase/migrations/20261005114101_harden_game_rewards_and_legacy_gacha.sql`

## Remaining risks

1. `roflix_award_watch()` vẫn là reward request dựa trên client event. Các giới hạn server đã giảm abuse nhưng chưa chứng minh client thực sự xem video.
2. Cần audit tiếp achievement/daily quest/reward RPC nếu các RPC đó vẫn nhận progress từ client.
3. Cloud Sync chưa được hợp nhất thành một service duy nhất.
4. Cần browser-level regression test cho comments, Gacha và pagination.
5. Cần kiểm tra toàn bộ script loading order để loại bỏ hoàn toàn legacy comment module `js/app/07-b-nh-lu-n.js` nếu nó vẫn ghi localStorage/được gọi sau realtime layer.

## Commits from this audit

- `104b9ff9a0f44072ee4c2592f5510068643437e3` security: harden watch rewards and legacy gacha RPCs
- `efed99cfc6d1c6cbd661ef5628ede0c50078f9be` fix: make source pagination metadata local to API result
- `8b2802221f45bc670ff4644cafe5ac9ff3979e7e` fix: align player comments with canonical comments schema
- `14f3562ed8058fc2fb3cb6391331c6298b6638bf` fix: remove fake and local fallback comments
- `2a52f29047c043c05074f3c900bb7ca36b0322c5` security: align game hardening migration with Supabase

## Verification

- Supabase migration list confirms game hardening migration is present.
- `roflix_watch_reward_claims` exists and is empty before new claims.
- Canonical movie comment table verified as `roflix_movie_comments`.
- Existing `movie_comments` data was not deleted.
- No production secrets were added.
