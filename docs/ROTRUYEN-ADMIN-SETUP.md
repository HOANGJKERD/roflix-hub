# RoTruyen: cài đặt và vận hành

## Những gì có trong nhánh

- `index.html` là cổng RoHub; `roflix.html` giữ nguyên ứng dụng RoFlix đã có.
- `rotruyen.html` là ứng dụng đọc truyện độc lập.
- `rotruyen-admin.html` là trung tâm quản trị riêng.
- `css/rotruyen/` và `js/rotruyen/` tách biệt khỏi runtime RoFlix.
- `supabase/migrations/20261009000000_rotruyen_admin.sql` tạo catalog, chương, settings, audit log và Row Level Security.

## Bật catalog và quản trị

1. Mở Supabase Dashboard của dự án RoHub/RoFlix.
2. Mở SQL Editor, kiểm tra project/ref đang đúng rồi chạy toàn bộ migration `supabase/migrations/20261009000000_rotruyen_admin.sql`.
3. Xác nhận bảng `profiles` đã tồn tại và tài khoản quản trị có `role = 'admin'`, `account_status = 'active'`. Đây là cùng quy ước mà RoFlix Admin hiện dùng.
4. Mở `/rotruyen-admin.html`, đăng nhập bằng tài khoản quản trị.
5. Thêm tác phẩm, chọn rating, kiểm tra URL bìa và chỉ bật `Xuất bản công khai` khi metadata/nội dung được phép phân phối.
6. Thêm chương cho tác phẩm. Nếu có `page_manifest` gồm mảng URL ảnh HTTPS thì trình đọc có thể hiển thị ảnh; nếu chỉ có `external_url` thì ứng dụng mở nguồn trong tab mới.
7. Mở `/rotruyen.html` và chọn **Catalog RoTruyện** để tải các tác phẩm đã xuất bản.

## Adapter nguồn ngoài

### MangaDex

Chọn **Tìm trên MangaDex** để truy vấn API công khai. Giao diện lọc kết quả theo bản dịch tiếng Việt và chỉ yêu cầu rating `safe` / `suggestive`; không truy vấn rating `erotica` hoặc `pornographic`. Chương chỉ hiển thị nếu API có bản dịch tiếng Việt. API, CORS, tốc độ và dữ liệu sẵn có do nhà cung cấp kiểm soát, nên lỗi nguồn sẽ không đồng nghĩa với lỗi toàn bộ ứng dụng.

### LongBookApi

Chọn **LongBook API** chỉ sau khi đã triển khai LongBookApi của riêng bạn hoặc có endpoint mà bạn được phép dùng. Trong Admin → Nguồn API, cấu hình base URL HTTPS và bật adapter. Frontend thử `GET /book?start=0&limit=24` và `GET /book/search?keyword=...`; nếu bản triển khai có response schema hoặc tham số tìm kiếm khác, cần điều chỉnh adapter theo README/source của đúng phiên bản. Repo công khai không có nghĩa là đã có endpoint live. Không đặt mật khẩu hoặc khóa riêng tư trong base URL hay JavaScript.

### TruyenDex

TruyenDex được xem là tham khảo về trải nghiệm MangaDex tiếng Việt, không được nhúng hoặc sao chép mã nguồn khi chưa xác minh license. Kiểm tra lại điều khoản hiện hành và chính sách attribution trước khi dùng bất kỳ API hay dữ liệu nào của bên thứ ba. Không giả định TruyenDex có API public ổn định.

## Bảo mật

- RLS trong Supabase kiểm tra `profiles.role = 'admin'` và trạng thái active cho thao tác quản trị.
- Nội dung `erotica` trong catalog và chương yêu cầu phiên đăng nhập ở policy; việc này không thay thế kiểm tra tuổi/pháp lý ở cấp sản phẩm.
- Admin page không được đưa vào App Shell cache của service worker.
- Khóa chuột phải, chặn F12/Ctrl+U và cảnh báo DevTools chỉ là biện pháp gây cản trở nhẹ. Người dùng vẫn có thể tải tài nguyên, dùng trình duyệt khác hoặc gọi API trực tiếp. RLS mới là lớp kiểm soát quyền dữ liệu.
- Không có Supabase service-role key ở frontend. Publishable key chỉ an toàn khi RLS được bật và policy đúng.
- Trước khi dùng production: chạy migration trên đúng project, kiểm tra policies bằng tài khoản anon/user/admin, kiểm tra CORS và nguồn ảnh, xem audit log, kiểm tra bản mobile/desktop và hồi quy RoFlix.

## Trạng thái

Đây là nhánh triển khai và chưa tự động có nghĩa schema đã được áp dụng lên Supabase. Chưa xác nhận được API LongBook live, chưa có test trình duyệt end-to-end, và chưa nên merge/production cho tới khi hoàn tất các kiểm tra trên.

## Quyền Admin RoHub dùng chung

- Chốt mô hình: tài khoản đang có `public.profiles.role = 'admin'` và `account_status = 'active'` trên RoFlix tự động được coi là **Admin RoHub**, có quyền quản trị cả RoFlix và RoTruyện. Không tạo tài khoản admin thứ hai, không lưu mật khẩu riêng và không cần thêm role mới vì schema hiện dùng chung role `admin`.
- RoTruyện Admin kiểm tra phiên Supabase Auth, sau đó xác minh `profiles.role = 'admin'` và trạng thái tài khoản còn hoạt động. Các thao tác dữ liệu được bảo vệ thêm bởi Row Level Security (RLS), không chỉ bởi giao diện.
- Migration `20261009000000_rotruyen_admin.sql` đã được áp dụng vào dự án Supabase RoHub/RoFlix được kết nối. Sau khi deploy bản frontend tương ứng, đăng nhập bằng tài khoản admin RoFlix hiện có tại `/rotruyen-admin.html` để kiểm tra quyền thực tế.

## Tài khoản dùng chung RoFlix / RoTruyện

- Mở `/rotruyen-account.html` để đăng nhập, tạo tài khoản, sửa tên hiển thị/giới thiệu, đổi giao diện sáng/tối và đăng xuất.
- RoTruyện dùng cùng `window.rfSupabase`, project URL và publishable key với RoFlix. Phiên Supabase Auth trên cùng origin được chia sẻ bởi SDK storage key mặc định; đăng nhập tại một app sẽ được app còn lại nhận ra khi tải lại hoặc nhận auth event.
- Không tạo bảng mật khẩu riêng. Mật khẩu được quản lý bởi Supabase Auth; tên hiển thị/giới thiệu được cập nhật vào auth user metadata, còn phần hồ sơ cục bộ tương thích với `roflix-profile`.
- Theme được lưu trong `localStorage.rohub-theme` và áp dụng trên các trang RoTruyện/account. Hiện theme chưa tự đồng bộ với theme RoFlix nếu RoFlix không đọc khóa này.
- Tủ truyện và lịch sử đọc vẫn là localStorage ở bản hiện tại; chưa tuyên bố đồng bộ giữa nhiều thiết bị.
- Sau khi đăng nhập, hãy kiểm thử cùng email trên RoFlix và RoTruyện, rồi đăng xuất ở một bên và xác nhận phiên bên kia cũng hết hiệu lực.
