# RoFlix Admin Center

## Mục tiêu

Tách hoàn toàn khu quản trị khỏi giao diện xem phim.

## Các lớp

### Client
- `admin.html`: layout
- `css/admin/admin.css`: giao diện
- `js/admin/admin.js`: dashboard, users, analytics, audit

### Database
- `roflix_site_events`: event truy cập
- `roflix_active_sessions`: heartbeat / session hoạt động
- `roflix_admin_audit_logs`: audit
- `roflix_admin_stats()`: aggregate dashboard
- `roflix_admin_users()`: directory tài khoản + email
- `roflix_admin_set_role()`: đổi quyền
- `roflix_admin_set_status()`: khóa/mở tài khoản

## Quyền

`role = admin` mới được vào Admin Center và gọi RPC quản trị.

`role = user` không được đọc analytics hoặc audit.

## Định nghĩa số liệu

- **Tài khoản**: số dòng trong `public.profiles`.
- **Truy cập hôm nay**: số `session_id` khác nhau trong event hôm nay.
- **Người xem hôm nay**: số `user_id` khác nhau trong event hôm nay.
- **Lượt xem phim**: event `movie_view`.
- **Đang hoạt động**: session có heartbeat trong 5 phút.
- **Top phim**: event `movie_view` trong 30 ngày.

## Giới hạn

Analytics client-side không thể đảm bảo 100% nếu trình duyệt chặn request, người dùng mất mạng, ad blocker hoặc đóng tab trước khi heartbeat/event được gửi.

Số phim là số API nguồn báo về, vì RoFlix không lưu toàn bộ catalog phim vào Supabase.
