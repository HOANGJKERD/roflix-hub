# RoFlix Admin 5.0

## Mục Quản lý phim
Trang `admin.html` → **Quản lý phim**.

- Ẩn phim nguồn (KKPhim/VSMOV) khỏi RoFlix
- Sửa tên, tóm tắt, diễn viên, poster, nguồn ưu tiên
- Khóa phim: bắt buộc đăng nhập mới xem
- Tự khóa danh mục 18+
- Thêm phim MP4 vào bucket `roflix-media`

## SQL cần chạy
Trong Supabase SQL Editor, chạy lần lượt:

1. `supabase/setup.sql`
2. `supabase/admin_analytics.sql`
3. `supabase/v2_release_comments_realtime.sql`
4. `supabase/mega_upgrade.sql`
5. `supabase/movie_control_50.sql`  ← bắt buộc cho khóa phim / MP4

Sau đó đặt role admin:

```sql
update public.profiles set role = 'admin' where id = '<USER_UUID>';
```

## Suite
Cloud Sync 4.0 · Release Schedule 3.0 · Comment Realtime 3.0 · Watch Party 3.0 · Gacha 4.0 · Admin Dashboard 5.0 · UI/UX Mobile 3.0
