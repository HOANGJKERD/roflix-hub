# RoFlix Hub FULL SPLIT

Bản RoFlix được tách thành nhiều file để dễ phát triển, sửa lỗi và mở rộng backend.

## Cấu trúc

```text
RoFlix_Hub_FULL_SPLIT/
├── index.html                 # Trang xem phim
├── admin.html                 # KHU ADMIN RIÊNG
├── css/
│   ├── ...                    # CSS theo module
│   └── admin/admin.css        # Giao diện Admin Center
├── js/
│   ├── config/                # Cấu hình
│   ├── core/                  # Supabase + boot
│   ├── app/                   # Chức năng trang xem phim, tách từng module
│   ├── features/              # Tools / tiện ích
│   ├── integrations/          # Cloud / Supabase community
│   ├── analytics/             # Tracking truy cập + người xem
│   ├── admin/                 # Logic Admin Center
│   └── security/              # Bảo vệ phía client
├── supabase/
│   ├── setup.sql              # Schema cơ bản + Auth -> profiles
│   ├── auth_profiles_fix.sql  # Đồng bộ Auth -> profiles cho user cũ
│   └── admin_analytics.sql    # Analytics + user control + audit
└── docs/
    ├── ARCHITECTURE.md
    ├── AUTH_FLOW.md
    └── SOURCE.md
```

## 1. Chạy RoFlix

Dùng VS Code + Live Server hoặc một HTTP server. Không nên mở bằng `file://`.

Trang chính:

```text
http://127.0.0.1:5500/index.html
```

Admin:

```text
http://127.0.0.1:5500/admin.html
```

## 2. Supabase

Chạy theo thứ tự trong Supabase SQL Editor:

1. `supabase/setup.sql`
2. Nếu database cũ có Auth nhưng thiếu profile: `supabase/auth_profiles_fix.sql`
3. `supabase/admin_analytics.sql`

Tài khoản đầu tiên được cấp `role = 'admin'` thủ công trong SQL Editor.

## 3. Admin Center

Admin Center là **trang riêng**, không còn phụ thuộc bảng quản trị cục bộ trong modal của trang xem phim.

Có các khu:

- Dashboard tổng quan
- Tổng số tài khoản / Admin
- Truy cập hôm nay
- Người xem đăng nhập hôm nay
- Lượt xem / lượt phát phim
- Người đang hoạt động trong 5 phút gần nhất
- Tổng phim theo VSMOV và KKPhim
- Top phim được xem
- Biểu đồ truy cập 14 ngày
- Quản lý tài khoản
- Tìm kiếm user
- Đổi role `user/admin`
- Đổi trạng thái `active/suspended/banned`
- Khu kiểm duyệt bài cộng đồng: ẩn/hiện/xóa
- Khu kiểm duyệt và quyền
- Nhật ký thay đổi quyền/trạng thái
- Tự refresh dashboard mỗi 15 giây

## 4. Analytics hoạt động thế nào?

Trang xem phim gửi event về Supabase qua RPC:

```text
Người truy cập
   ↓
roflix_site_events
   ↓
Dashboard Admin
```

Heartbeat:

```text
Browser
   ↓ mỗi ~60 giây
roflix_heartbeat()
   ↓
roflix_active_sessions
   ↓
Admin: "đang hoạt động"
```

`active_now` được tính từ các session có heartbeat trong **5 phút gần nhất**. Đây là số session hoạt động, không phải số người duy nhất tuyệt đối.

## 5. Bảo mật

- Không dùng Supabase service-role key trong browser.
- Admin Center kiểm tra role trong database.
- RPC nhạy cảm dùng `SECURITY DEFINER` và kiểm tra `roflix_is_admin()`.
- Analytics không cho user thường đọc toàn bộ event.
- Thay đổi role/trạng thái được ghi vào `roflix_admin_audit_logs`.

## 6. Lưu ý về số lượng phim

RoFlix hiện lấy dữ liệu phim từ API VSMOV và KKPhim. Admin Center đọc tổng số do API nguồn báo về. Đây không phải một kho phim tự lưu toàn bộ trong Supabase.

## 7. Lưu ý về localStorage

Tài khoản đăng ký/đăng nhập chính dùng **Supabase Auth**. Một số dữ liệu giao diện cá nhân như theme, profile UI, cache, lịch sử cục bộ... vẫn có thể dùng localStorage vì chúng không phải hệ thống tài khoản.


## RoFlix Pro V2 update

### Source priority
- KKPhim = nguồn chính
- VSMOV = nguồn phụ / fallback

### UI V2
- Header RoFlix PRO trên trang chi tiết và trang xem phim
- Nút Xem phim ngay dưới poster ở trang chi tiết
- Tóm tắt phim ngay dưới player
- Bình luận cloud dưới player
- Gợi ý phim dưới trang chi tiết và trang xem phim
- Lịch phát hành công khai

### Admin Dashboard 2.0
- Realtime active viewers bằng Supabase Realtime + heartbeat
- Bảng Ai đang xem gì
- Quản lý tài khoản / role / trạng thái
- Kiểm duyệt community + movie comments
- Audit log
- Lịch ra phim: tạo / sửa / xóa / featured / thời gian phát hành

### SQL mới
Chạy sau các file cũ:
1. `supabase/setup.sql`
2. `supabase/auth_profiles_fix.sql`
3. `supabase/admin_analytics.sql`
4. `supabase/v2_release_comments_realtime.sql`

Lịch ra phim chuyển từ `scheduled` sang `released` khi người dùng/admin truy cập hệ thống sau thời điểm `release_at`. Đây là lịch hiển thị/phát hành trên RoFlix, không sửa dữ liệu của API KKPhim/VSMOV.


# RoFlix Pro Mega Upgrade 3.0

## Có gì mới
- Trang chủ 3.0: Discover, Đề xuất cho bạn, Lịch phát sóng và Sắp chiếu.
- Trang xem phim: Watch Party nâng cao, bình luận realtime, đề xuất và metadata.
- Watchlist cloud theo tài khoản Supabase.
- BXH thật trên Supabase, xếp theo Level/EXP/tập xem/Gacha.
- Gacha 3.0: thẻ nhân vật dọc 2:3, ảnh nhân vật từ Jikan API, 1-pull/10-pull và pity.
- Tài khoản: profile sync cloud, Watchlist, lịch sử/xem tiếp riêng tài khoản.
- Bình luận phim realtime bằng Supabase Realtime.
- Admin Dashboard 3.0: Game Center, Live Comments, Content Tools, lịch phim và analytics.
- Watch Party: Presence, danh sách thành viên, chat realtime, đồng bộ phim/tập.

## SQL mới
Sau khi các SQL V2 cũ đã chạy, chạy thêm:
`supabase/mega_upgrade.sql`

SQL này tạo game stats, watchlist, gacha inventory, leaderboard RPC và các RPC quản trị.

## Lưu ý Watch Party
Nguồn phim hiện được phát trong iframe cross-origin. Trình duyệt không cho RoFlix điều khiển play/pause/seek bên trong iframe nếu nhà cung cấp không cung cấp API/postMessage. Vì vậy Watch Party 3.0 đồng bộ phòng, thành viên, phim, tập và chat.

## RoGem Admin Management

After installing this version, run `supabase/mega_upgrade.sql` in Supabase SQL Editor once. The SQL adds protected Admin RPCs for RoGem management and an audit table.

In `admin.html` → `Game Center` → `Quản lý RoGem`, an admin can:
- Search by email, display name, or User ID.
- Add Gem with quick actions (+100 / +500 / +1,000).
- Remove Gem (-100 / -500).
- Set an exact Gem balance.
- Add an optional reason.
- Review the target account's Gem transaction history.

All changes are executed through `SECURITY DEFINER` RPCs that verify `roflix_is_admin()` and are written to both the Gem transaction log and the Admin audit log.
