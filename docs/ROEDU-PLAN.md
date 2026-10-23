# RoEdu trong hệ sinh thái RoHub

## Quyết định sản phẩm
- Tên: **RoEdu**.
- Repository: `HOANGJKERD/roflix-hub`, nhánh chính `main`.
- Điểm vào: thẻ riêng tại trang chọn ứng dụng RoHub và trang độc lập `/roedu` (tệp `roedu.html`).
- Phong cách: ngôn ngữ thiết kế RoHub, giao diện học tập hiện đại, màu vàng/cyan/tím và gamification.
- Bất biến: không thay thế hoặc xóa RoFlix, RoTruyen, RoHub Admin, RoHub Studio.

## Phạm vi sản phẩm
1. Thư viện lớp 10, 11, 12, phân cấp môn → chương → bài.
2. Học liệu từ SGK và nguồn chính thức; tài liệu mở khi giấy phép cho phép; bài tập/lời giải tự biên soạn.
3. Luyện tập, giải thích đáp án, lưu lịch sử và tiến độ.
4. XP, nhiệm vụ, huy hiệu, cấp độ và bảng xếp hạng.
5. Tài khoản và đồng bộ tiến độ qua hệ thống xác thực/dữ liệu dùng chung sau khi thiết kế schema và quyền truy cập.
6. Khu quản trị để quản lý nguồn, giấy phép, metadata, bài học, câu hỏi và trạng thái kiểm duyệt.

## Trạng thái trong lần tích hợp đầu
- Đã thêm trang tĩnh `roedu.html`, stylesheet `css/roedu.css`, tương tác demo `js/roedu.js`.
- Có bộ lọc lớp 10/11/12, tìm kiếm danh mục môn khung, câu hỏi mẫu, thẻ nguồn tham khảo.
- Các giá trị XP, hồ sơ và câu hỏi được gắn nhãn demo; chưa lưu dữ liệu thật.
- Danh mục môn là khung ban đầu, không khẳng định là danh mục chương/bài đã được đối chiếu cho từng bộ sách.
- Nguồn được đánh dấu “đã xác minh” trong UI chỉ có nghĩa đường dẫn/nguồn chính thức đã được chọn để tham khảo, không có nghĩa toàn bộ nội dung từng môn đã được xác minh.

## Nguồn khởi đầu
- NXBGDVN, học liệu số: https://hoclieuso.nxbgd.vn/digital-books?grade=10
- Bộ GDĐT, Chương trình GDPT 2018: https://moet.gov.vn/content/tintuc/Lists/News/Attachments/8421/chuong-trinh-tong-the-ctgdpt-2018.pdf
- Hướng dẫn truy cập SGK điện tử NXBGDVN: https://www.nxbgd.vn/bai-viet/huong-dan-truy-cap-sach-giao-khoa-dien-tu-tren-trang-taphuannxbgdvn

### Nguyên tắc sử dụng nội dung
- Ghi lại tên tài liệu, tác giả/đơn vị, URL gốc, ngày kiểm tra, giấy phép/điều khoản, lớp/môn/chương/bài và trạng thái kiểm duyệt.
- Không mặc định rằng tài liệu đọc miễn phí được phép sao chép hoặc tái phân phối.
- Ưu tiên liên kết tới nguồn chính thức, metadata, tóm tắt và câu hỏi/lời giải tự biên soạn.
- Chỉ nhập tài liệu mở khi đã xác minh giấy phép và tuân thủ yêu cầu ghi công/điều kiện chia sẻ lại.

## Lộ trình kỹ thuật
1. Kiểm tra UI/route trên Production, mobile và đường dẫn quay về RoHub.
2. Lập danh mục nguồn lớp 10–12 theo từng môn/chương/bài, tách rõ đã xác minh và cần kiểm tra.
3. Thiết kế schema Supabase cho catalog, sources, lessons, questions, attempts, profiles/progress; viết migration và RLS.
4. Tích hợp xác thực tài khoản dùng chung theo cơ chế hiện có, không tự ý làm hỏng luồng RoHub hiện hành.
5. Xây công cụ quản trị RoEdu trong RoHub Admin, có trạng thái draft/review/published và nhật ký nguồn.
6. Chỉ đưa XP/ranking vào vận hành khi ghi điểm được kiểm soát phía server/database và có chống gửi điểm giả.
7. Kiểm thử hồi quy RoFlix, RoTruyen, chooser, Admin và Studio trước khi phát hành.

## Kiểm tra phát hành
- [ ] Tệp chooser có thẻ RoEdu và giữ nguyên các thẻ cũ.
- [ ] `/roedu` trả trang đúng.
- [ ] Mobile layout và keyboard navigation hoạt động.
- [ ] Không ghi XP/tiến độ giả vào dữ liệu thật.
- [ ] RLS và quyền admin đã được kiểm thử trước khi bật ghi dữ liệu.
- [ ] Production deployment được xác minh riêng, không suy ra từ việc commit thành công.
