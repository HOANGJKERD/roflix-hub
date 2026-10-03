# RoFlix Pro V2 Update

## 1. Nguồn phim

- **KKPhim** là nguồn chính.
- **VSMOV** là nguồn phụ/fallback.
- Nếu KKPhim lỗi hoặc trả danh sách rỗng, RoFlix thử VSMOV.
- Người dùng vẫn có thể đổi nguồn thủ công ở khu Nguồn phim.

## 2. Trang chi tiết phim

- Header riêng: `RoFlix PRO`.
- Nút `Xem phim` ngay dưới poster.
- Tên tiếng Việt + tên tiếng Anh.
- Tóm tắt phim.
- Đạo diễn, diễn viên, trạng thái, chất lượng, số tập.
- Gợi ý phim ở cuối trang.
- Lịch phim sắp ra ở cuối trang.

## 3. Trang xem phim

- Header `RoFlix PRO`.
- Không còn dòng `Nguồn: VSMOV` dưới tên phim.
- Hiển thị tên tiếng Anh của phim dưới tiêu đề.
- Tóm tắt phim dưới player.
- Bình luận cloud dưới player.
- Gợi ý phim tiếp theo.
- Lịch phim.

## 4. Bình luận phim

Bảng `movie_comments` nằm trong Supabase.

- User đã đăng nhập mới được đăng bình luận.
- Người dùng có thể xem bình luận visible.
- Admin có thể ẩn/hiện/xóa bình luận.
- Có Realtime publication cho bảng.

## 5. Admin Dashboard 2.0

### Dashboard

- Tổng tài khoản.
- Tổng Admin.
- Truy cập hôm nay.
- Viewer đã đăng nhập hôm nay.
- Movie views.
- Movie plays.
- Online hiện tại.
- Tài khoản bị hạn chế.
- Biểu đồ 14 ngày.
- Top phim.
- Kho phim KKPhim/VSMOV.
- Người đang hoạt động.
- Hoạt động gần đây.

### Realtime viewer monitoring

`roflix_active_sessions` được cập nhật bởi heartbeat từ trang RoFlix.

Admin sử dụng Supabase Realtime để nhận thay đổi và refresh dashboard.

Màn hình `Ai đang xem gì?` hiển thị:

- Guest/User.
- User UUID hoặc session.
- Trang hiện tại.
- Phim đang xem.
- Lần heartbeat gần nhất.

Online được tính bằng heartbeat trong 5 phút gần nhất.

## 6. Lịch ra phim

Admin có thể tạo:

- Slug.
- Tên phim.
- Tên tiếng Anh.
- Nguồn KKPhim/VSMOV.
- Poster.
- Ngày giờ phát hành.
- Tóm tắt.
- Ghi chú Admin.
- Featured.

Khi người dùng/admin mở RoFlix sau `release_at`, RPC `roflix_sync_release_schedule()` chuyển trạng thái `scheduled` sang `released`.

Lưu ý: lịch này quản lý lịch hiển thị/phát hành trong RoFlix. Nó không thay đổi dữ liệu gốc của KKPhim hoặc VSMOV.

## 7. SQL migration order

Chạy theo thứ tự:

1. `setup.sql`
2. `auth_profiles_fix.sql`
3. `admin_analytics.sql`
4. `v2_release_comments_realtime.sql`

Nếu database đã chạy ba file đầu trong bản cũ, chỉ cần chạy file số 4 cho phần V2 mới.

## 8. Cấu trúc module mới

```text
js/
├── admin/
│   ├── admin.js
│   └── release-schedule-admin.js
├── analytics/
│   └── roflix-analytics.js
├── features/
│   ├── roflix-tools.js
│   ├── roflix-v2-ui.js
│   ├── movie-comments-cloud.js
│   └── release-schedule.js
└── app/
    ├── 00-api-config.js
    ├── 01-h-m-g-i-api.js
    ├── 05-chi-ti-t-phim.js
    └── 06-ph-t-phim.js
```
