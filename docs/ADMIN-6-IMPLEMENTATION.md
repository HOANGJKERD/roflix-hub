# RoFlix Admin 6.0

Ngày triển khai: 2026-10-05

## Phạm vi

Admin 6.0 bổ sung một control plane dành cho quản trị viên, tập trung vào:

- Live Operations: online, đang xem, user online, event/error trong 5 phút.
- User Control Center: active/suspended/banned, suspend có thời hạn, force logout toàn bộ hoặc từng session.
- Security Feed: audit log cho các thao tác nhạy cảm.
- Feature Flags: maintenance, playback, comments, Gacha, registration, Watch Party, Cloud Sync.
- Control Events: luồng sự kiện quản trị realtime.
- Realtime: Supabase Postgres Changes cho các bảng control plane và security state.

## Database

Migration chính:

- `20261005130000_admin_6_control_plane_realtime.sql`
- `20261005130500_admin_6_user_sessions.sql`
- `20261005131000_admin_6_security_definer_hardening.sql`
- `20261005131500_admin_6_client_enforcement.sql`
- `20261005132000_admin_6_function_grants_lockdown.sql`

Các bảng mới:

- `roflix_admin_feature_flags`
- `roflix_admin_control_events`

Các cột mới:

- `profiles.suspended_until`
- `profiles.security_version`
- `profiles.admin_note`
- `roflix_active_sessions.device_label`
- `roflix_active_sessions.revoked_at`
- `roflix_active_sessions.revoke_reason`

RPC chính:

- `roflix_admin_set_account_control`
- `roflix_admin_revoke_sessions`
- `roflix_admin_set_feature_flag`
- `roflix_admin_live_ops`
- `roflix_admin_security_feed`
- `roflix_admin_user_sessions`

Các RPC nhạy cảm chỉ được EXECUTE bởi role `authenticated`; bản thân RPC vẫn kiểm tra `roflix_is_admin()`.

## Frontend

- `js/admin/admin-6-control-plane.js`
- `css/admin/admin-6-control-plane.css`
- `js/admin/admin-v4-enhancements.js` tải control plane sau khi Admin Center khởi động.
- `js/features/roflix-suite-50.js` lắng nghe thay đổi `profiles.security_version` và trạng thái tài khoản để thực thi force logout/restriction ở client mà không cần refresh.

Không thay đổi ba shortcut công khai hiện tại:

1. `📚 Bộ sưu tập`
2. `🔄 Đồng bộ thiết bị`
3. `🛠️ Quản trị`

## Realtime model

Admin 6 sử dụng Postgres Changes cho control-plane tables vì số subscriber của trang admin thấp và cần triển khai trực tiếp trên các bảng hiện có. Supabase khuyến nghị Broadcast cho workload lớn hơn; nếu số subscriber hoặc throughput tăng mạnh, control bus có thể chuyển sang Broadcast từ database.

## Security notes

- RLS bật trên các bảng control-plane mới.
- Các mutation nhạy cảm chạy qua `SECURITY DEFINER` RPC và đã pin `search_path` rỗng.
- Function grants đã khóa khỏi `anon` và chỉ cấp cho `authenticated`, sau đó RPC tự kiểm tra admin.
- Không đưa service/secret key vào browser.
- Force logout hiện được ghi vào `roflix_active_sessions` và tăng `profiles.security_version`; client RoFlix phản ứng qua Realtime.

## Verification

Đã kiểm tra trực tiếp trên Supabase project:

- Feature flags mặc định tồn tại và đang ở trạng thái an toàn: maintenance OFF, playback/comments/Gacha/registration/Watch Party/Cloud Sync ON.
- Các control-plane tables đã được thêm vào publication `supabase_realtime`.
- Các Admin 6 RPC có `SECURITY DEFINER` và `search_path=''`.
- Các RPC nhạy cảm không còn EXECUTE cho `anon`.

## Chưa làm trong đợt này

- Health check sâu từng movie source/API và tự động failover nguồn phim.
- Playback error tracing theo từng browser/device.
- Browser E2E regression suite cho toàn bộ Admin 6.
- Broadcast-from-database cho high-scale event bus.

Đây là các hạng mục phù hợp cho Admin 6.1/6.2 sau khi control plane đã ổn định.
