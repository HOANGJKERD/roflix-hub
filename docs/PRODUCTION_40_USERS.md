# RoFlix Pro: cấu hình nhóm 30-40 người

## Mục tiêu

Bản production hiện tại ưu tiên tải ổn định cho nhóm khoảng 30-40 người dùng đồng thời, với Supabase làm backend.

## Những gì đã tối ưu

- RoGem được đọc/ghi từ `roflix_game_stats`, không còn tin số Gem do trình duyệt tự đặt.
- Gacha dùng RPC `roflix_gacha_roll()` để trừ Gem và sinh rarity ở server trong một transaction.
- Gacha collection được đồng bộ idempotent, tránh ghi trùng khi tab mở lâu.
- Watch History, profile và collection được đồng bộ theo user ID.
- Heartbeat online chạy khoảng 30 giây/lần khi tab đang visible.
- Analytics được xếp hàng và gửi theo batch nhỏ.
- Các RPC sync có fingerprint để bỏ qua payload lặp trong khoảng thời gian ngắn.
- Đã thêm index cho các truy vấn cộng đồng, lịch xem, Watch Party, session và analytics thường dùng.
- Realtime dùng cho các tính năng thật sự cần realtime, thay vì polling liên tục.

## Giới hạn thực tế

Supabase Free hiện có giới hạn Realtime 200 concurrent connections và 100 messages/second. Vì vậy 30-40 người dùng đồng thời nằm dưới giới hạn kết nối Realtime hiện tại, nhưng Watch Party/chat vẫn nên giữ payload nhỏ và không gửi Presence quá thường xuyên.

## Trước khi mở cho cả nhóm

1. Deploy commit mới lên Vercel.
2. Đăng nhập bằng 2 tài khoản khác nhau và kiểm tra profile/history/Gem.
3. Test Gacha X1 và X10, sau đó refresh trang và đăng nhập lại.
4. Mở Watch Party bằng 2-5 tài khoản, kiểm tra join/leave/sync.
5. Đăng 5-10 comment từ nhiều tài khoản và kiểm tra realtime.
6. Mở Admin và kiểm tra Gem/role/status.
7. Theo dõi Supabase Realtime Reports và Database usage trong lúc cả nhóm truy cập.

## Không nên làm

- Không bật polling 1-2 giây cho toàn site.
- Không gửi Presence liên tục.
- Không lưu Gem/role bằng localStorage làm nguồn sự thật.
- Không dùng `SELECT *` cho bảng lớn trong dashboard.
- Không đưa service-role key vào frontend.
