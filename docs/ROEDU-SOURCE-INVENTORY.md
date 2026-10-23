# RoEdu: danh mục nguồn sách chính thức và kiểm kê chương/bài

Ngày rà soát nguồn ban đầu: 23/10/2026

## Nguồn chính thức đã xác minh được đường dẫn

| Nguồn | URL | Trạng thái | Dùng thế nào |
|---|---|---|---|
| Học Liệu Số - NXBGDVN lớp 10 | https://hoclieuso.nxbgd.vn/digital-books?grade=10 | Đã xác minh trang nguồn | Dẫn link đến SGK điện tử. Cần ghi lại từng đầu sách và phiên bản. |
| Học Liệu Số - NXBGDVN lớp 11 | https://hoclieuso.nxbgd.vn/digital-books?grade=11 | Đã xác minh đường dẫn theo cấu trúc cổng | Dẫn link; cần rà soát từng đầu sách hiển thị. |
| Học Liệu Số - NXBGDVN lớp 12 | https://hoclieuso.nxbgd.vn/digital-books?grade=12 | Đã xác minh đường dẫn theo cấu trúc cổng | Dẫn link; cần rà soát từng đầu sách hiển thị. |
| Chương trình GDPT tổng thể 2018 - Bộ GDĐT | https://moet.gov.vn/content/tintuc/Lists/News/Attachments/8421/chuong-trinh-tong-the-ctgdpt-2018.pdf | Đã xác minh | Đối chiếu định hướng chương trình, không thay thế mục lục SGK. |
| Chương trình môn Lịch sử - Bộ GDĐT | https://moet.gov.vn/content/vanban/Lists/VBPQ/Attachments/1483/vbhn-chuong-trinh-mon-lich-su.pdf | Đã xác minh | Có cấu trúc nội dung theo lớp 10, 11, 12; phải kiểm tra văn bản điều chỉnh hiện hành. |
| Thông tin điều chỉnh CTGDPT 2018 - Bộ GDĐT | https://www.moet.gov.vn/tintuc/Pages/CT-GDPT-Tong-The.aspx?ItemID=8013 | Đã xác minh | Tham khảo điều chỉnh chương trình; cần đối chiếu văn bản pháp quy gốc. |
| Cổng tập huấn SGK - NXBGDVN | https://taphuan.nxbgd.vn/ | Đã xác minh | Tra cứu giới thiệu sách và tài liệu giáo viên; kiểm tra điều kiện từng tài liệu. |

## Phạm vi kiểm kê theo môn/lớp

Danh mục dữ liệu `data/roedu-sources.json` có ma trận ban đầu 45 dòng: 15 môn/hoạt động giáo dục × lớp 10, 11, 12. Mỗi dòng chứa URL SGK theo lớp, nguồn chương trình tham chiếu và trạng thái kiểm tra.

Các môn/hoạt động: Toán học; Ngữ văn; Ngoại ngữ 1 (ưu tiên Tiếng Anh); Lịch sử; Địa lí; Giáo dục kinh tế và pháp luật; Vật lí; Hóa học; Sinh học; Tin học; Công nghệ; Giáo dục thể chất; Giáo dục quốc phòng và an ninh; Hoạt động trải nghiệm, hướng nghiệp; Nội dung giáo dục địa phương.

**Trạng thái quan trọng:** ma trận này là danh sách việc cần tra cứu, không khẳng định 45 mục lục đã được đọc/đối chiếu. Trạng thái chương/bài, tên bộ sách và giấy phép của từng đầu sách hiện là `needsReview`.

## Cách hoàn thiện mục lục từng môn

Với mỗi lớp/môn:
1. Mở cổng SGK chính thức và ghi chính xác tên sách, nhà xuất bản, nhóm tác giả, năm/phiên bản, URL.
2. Lấy mục lục thực tế của đúng cuốn sách; nhập chương/chủ đề/bài theo thứ tự, không tự suy đoán.
3. Đối chiếu yêu cầu cần đạt trong chương trình môn học tương ứng của Bộ GDĐT.
4. Ghi ngày kiểm tra, URL gốc, giấy phép/điều khoản và quyền sử dụng.
5. Chỉ chuyển sang `verified` khi đã kiểm tra được đúng trang và nội dung. Nếu chưa đọc được mục lục hoặc chưa rõ quyền sao chép, giữ `needsReview`.
6. Bổ sung tài liệu mở và bài tập tự biên soạn sau khi ghi nguồn, giấy phép, tác giả/người rà soát và đáp án.

## Điều kiện sử dụng / bản quyền

- Việc xem sách miễn phí không tự động cấp quyền tải về rồi lưu trên RoHub, sao chép nguyên chương hoặc phân phối lại.
- Mặc định RoEdu nên lưu metadata và liên kết nguồn; không mirror toàn bộ SGK nếu chưa có quyền rõ ràng.
- Tài liệu mở phải ghi rõ loại giấy phép và tuân thủ điều kiện (ví dụ ghi công hoặc chia sẻ tương tự nếu áp dụng).
- Bài tập tự biên soạn phải viết độc lập, có lời giải và kiểm duyệt chất lượng; không chép nguyên câu hỏi/đáp án có bản quyền.
- Nguồn Bộ GDĐT là căn cứ chương trình; nội dung SGK cụ thể có thể thuộc các bộ sách/nhà xuất bản khác nhau.

## Nguồn tham khảo
- Bộ GDĐT, Chương trình GDPT tổng thể: https://moet.gov.vn/content/tintuc/Lists/News/Attachments/8421/chuong-trinh-tong-the-ctgdpt-2018.pdf
- NXBGDVN, Học Liệu Số: https://hoclieuso.nxbgd.vn/digital-books?grade=10
- NXBGDVN, Tập huấn: https://taphuan.nxbgd.vn/
- Bộ GDĐT, thông tin điều chỉnh chương trình: https://www.moet.gov.vn/tintuc/Pages/CT-GDPT-Tong-The.aspx?ItemID=8013
