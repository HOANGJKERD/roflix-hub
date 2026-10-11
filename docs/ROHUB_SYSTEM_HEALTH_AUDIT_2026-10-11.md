# Báo cáo kiểm tra RoHUB và System Health Center
**Ngày:** 2026-10-11  
**Repository:** https://github.com/HOANGJKERD/roflix-hub  
**Nhánh kiểm tra:** main

## Phạm vi đã kiểm tra
- Đọc cây repository đệ quy từ GitHub: 166 tệp.
- Kiểm tra có mục tiêu các trang `index.html`, `admin.html`, `roflix.html`, `rotruyen.html`, `rohub-studio.html`; script xác thực/quản trị; cấu hình Supabase; published theme runtime; migration theme; API AniMapper và test proxy.
- Cây repository có 99 tệp JavaScript, 24 CSS, 21 SQL và 7 HTML.
- Có thư mục `tests/` với test Node tích hợp sẵn; không tìm thấy `package.json`, `playwright.config.js` hoặc workflow GitHub Actions trong cây hiện tại.

## Thay đổi đã commit
1. Thêm `js/admin/system-health.js`: chẩn đoán phiên Supabase, quyền admin, metadata các bảng trọng yếu, tài nguyên frontend và phản hồi API bên ngoài.
2. Thêm `css/admin/system-health.css`: giao diện trạng thái đạt/cảnh báo/lỗi, responsive.
3. Thêm mục **System Health** trong `admin.html`, nạp script/style mới và nối điều hướng trong `js/admin/admin.js`.
4. Cho phép xuất kết quả kiểm tra thành JSON để lưu lại và so sánh.
5. Loại bỏ một lần nạp lặp Supabase JS SDK trong `roflix.html`.
6. Cập nhật README và báo cáo này.

## Các giới hạn quan trọng
- Công cụ kiểm tra chạy từ trình duyệt. CORS, tiện ích chặn request hoặc mạng người dùng có thể khiến API được đánh dấu cảnh báo dù máy chủ nguồn vẫn hoạt động.
- Endpoint trả HTTP 200 không chứng minh rằng tìm phim, lấy danh sách tập hay phát video hoạt động end-to-end.
- Truy vấn bảng Supabase phản ánh quyền của phiên hiện tại; lỗi có thể do bảng/migration chưa tồn tại hoặc chính sách RLS. Cần đối chiếu với schema và quyền thật trên Supabase.
- Chưa xác minh migration `20261010_rohub_theme_versions.sql` đã được áp dụng ở dự án Supabase production hay chưa.
- Chưa chạy browser automation, chưa thực hiện đăng nhập thật, chưa xác minh deployment production và chưa chạy bộ test Node trong môi trường này. Vì vậy, các thay đổi được xác minh qua nội dung và SHA trên GitHub, không được coi là kiểm thử runtime thành công.

## Phát hiện cần ưu tiên tiếp theo
1. **P1 · Theme Publish/Rollback:** luồng Studio hiện thực hiện nhiều lần ghi database riêng lẻ. Nếu bước cập nhật bản mới thất bại sau khi lưu trạng thái bản cũ, trạng thái published có thể không như mong muốn. Nên chuyển publish/rollback sang RPC/transaction phía database và kiểm thử cạnh tranh.
2. **P1 · Theme runtime:** cần kiểm tra lại cách chọn phiên bản khi có theme mục tiêu `both`, `roflix` và `rotruyen`; số phiên bản theo từng target không nên được so sánh như một chuỗi phiên bản toàn cục nếu không có quy tắc ưu tiên rõ ràng.
3. **P1 · Bảo mật dữ liệu:** xác minh trực tiếp RLS cho các bảng admin, theme và RoTruyện; UI xác thực không thay thế chính sách database.
4. **P2 · Tự động hóa:** bổ sung lệnh test chuẩn và CI để chạy `node --test` khi push/PR; cân nhắc browser smoke test cho các luồng đăng nhập, chuyển trang và kiểm tra sức khỏe.
5. **P2 · RoFlix nguồn phát:** health check API chỉ là thăm dò cơ bản; vẫn cần test luồng tìm phim → tập → server → URL phát, ưu tiên nguồn ANIMEVIETSUB theo yêu cầu dự án.

## Cách đọc trạng thái
- **Đã commit:** GitHub đã nhận các thay đổi và nội dung được đọc lại để xác minh.
- **Chưa kiểm thử runtime:** không có kết luận rằng các trang đã chạy thành công trên hosting hoặc backend thật.
- **Bước kế tiếp đề xuất:** xử lý Publish/Rollback bằng giao dịch database và bổ sung test tự động sau khi xác minh schema Supabase.
