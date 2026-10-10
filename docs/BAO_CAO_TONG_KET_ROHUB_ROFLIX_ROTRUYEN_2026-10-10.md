# Báo cáo tổng kết ROHUB • ROFLIX • ROTRUYEN
**Mốc tổng kết:** 10/10/2026  
**Repository:** https://github.com/HOANGJKERD/roflix-hub

> Báo cáo này tổng hợp các quyết định sản phẩm và tiến độ được ghi nhận trong quá trình làm việc. Không phải kiểm toán mã nguồn toàn diện. Các mục chưa có bằng chứng trực tiếp được ghi rõ là cần xác minh, tránh nhầm giữa có giao diện/code, lưu được dữ liệu và đã chạy production.

## 1. Tóm tắt điều hành
ROHUB được định hướng thành nền tảng chung cho hai ứng dụng: **ROFLIX** (xem phim/anime) và **ROTRUYEN** (đọc truyện). Quyết định kiến trúc đã chốt là một repository, nền tảng dùng chung, nhưng mỗi app có nhận diện, màu sắc, nội dung và luồng nghiệp vụ riêng. Gateway có intro điện ảnh. Mọi thay đổi nền tảng phải bảo vệ ROFLIX khỏi hồi quy.

Ở mốc báo cáo, PR #4 được ghi nhận có Visual Template Editor, kéo-thả và luồng Preview → Publish → Rollback, cùng các bảng Supabase `rohub_templates` và `rohub_template_revisions` có RLS. Tuy nhiên, theo trạng thái làm việc gần nhất, PR chưa được xác nhận merge; publish/rollback đã lưu revision nhưng chưa xác nhận tác động lên frontend công khai. Bước kỹ thuật then chốt là **Published Theme Runtime**.

## 2. Tầm nhìn và vai trò từng sản phẩm
### ROHUB
Lớp nền tảng chung cho hệ sinh thái: thiết kế hệ thống, thành phần UI dùng chung, cấu hình theme, quản trị và các hạ tầng phù hợp. Dùng chung nền không có nghĩa là trộn nghiệp vụ phim và truyện vào một miền dữ liệu.

### ROFLIX
Ứng dụng xem phim/anime. Các vấn đề từng được phản ánh gồm không tải/tìm được nguồn, giao diện hiện trạng thái nhưng phim không phát. Người dùng yêu cầu ưu tiên ANIMEVIETSUB. Chính sách truy cập đã chốt: người xem nội dung thông thường được xem miễn phí, không cần đăng nhập; chỉ nội dung thuộc nhóm 18+ mới yêu cầu đăng nhập để truy cập.

### ROTRUYEN
MVP gồm danh mục truyện và trình đọc từng chương/phần. Yêu cầu đã chốt:
- Dùng dữ liệu thật, xóa tác phẩm mẫu khỏi trải nghiệm công khai.
- Khách chưa đăng nhập vẫn duyệt danh mục và đọc truyện.
- Đăng nhập dành cho lịch sử đọc, yêu thích và đăng truyện.
- Giao diện đồng bộ ngôn ngữ thiết kế ROFLIX nhưng nội dung và dữ liệu nghiệp vụ tách biệt.

## 3. Các chặng phát triển
1. **Xây dựng ROFLIX:** tập trung khám phá nội dung, tìm nguồn và phát video; thử nghiệm cho thấy lỗi tải nguồn/phát phim cần kiểm tra xuyên suốt, không chỉ kiểm tra giao diện.
2. **Điều chỉnh chính sách truy cập:** bỏ yêu cầu đăng nhập đại trà; nội dung thường miễn phí, nhóm 18+ mới yêu cầu đăng nhập.
3. **Mở rộng ROTRUYEN:** xây danh mục và reader, dùng dữ liệu thật, bỏ demo content, cho khách đọc tự do.
4. **Chuẩn hóa ROHUB:** chốt mô hình một repo, hai app, nền tảng dùng chung, Gateway intro điện ảnh, nhận diện chung với bảng màu riêng.
5. **Template Builder:** PR #4 được ghi nhận có editor trực quan, kéo-thả và Preview → Publish → Rollback; trạng thái merge cần xác minh trực tiếp.
6. **Published Theme Runtime:** yêu cầu mới nhất là bản nháp không tác động người xem; public runtime chỉ đọc bản đã publish; rollback phải phục hồi đúng cấu hình ổn định trước đó.

## 4. ROFLIX: chức năng, sự cố và tiêu chí nghiệm thu
### Phạm vi
- Khám phá/tìm phim và anime.
- Chọn nguồn, tải metadata/URL nguồn và phát video.
- Ưu tiên ANIMEVIETSUB theo yêu cầu.
- Nội dung thông thường xem miễn phí không cần tài khoản; nội dung 18+ cần đăng nhập.

### Sự cố đã được phản ánh
- Không tải hoặc không tìm thấy nguồn.
- Giao diện phản hồi nhưng video không phát.
- Chỉ thấy trạng thái màn hình không đủ để chứng minh luồng phát hoạt động.
- Header/Referer có thể là một yếu tố tương thích, nhưng không nên mặc định đó là nguyên nhân duy nhất.

### Kiểm thử cần có
- Kết quả tìm kiếm có thể chọn; lỗi/rỗng được giải thích rõ.
- Chọn nguồn cho URL hợp lệ hoặc lỗi cụ thể.
- Video phát thật trên trình duyệt mục tiêu.
- Có fallback khi nguồn ưu tiên không khả dụng nhưng vẫn giữ thứ tự ưu tiên sản phẩm.
- Khách xem được nội dung thường; kiểm soát 18+ nhất quán ở giao diện và backend/API.

## 5. ROTRUYEN: MVP, dữ liệu và quyền
### MVP
- Danh mục truyện có dữ liệu thật.
- Trang chi tiết với thông tin tác phẩm, trạng thái và danh sách chương.
- Reader có điều hướng chương trước/sau, hiển thị tốt trên desktop và mobile.
- Tài khoản tùy chọn cho lịch sử đọc, yêu thích và đăng truyện.
- Trạng thái loading, dữ liệu trống và lỗi tải rõ ràng.

### Nguyên tắc dữ liệu
- Không hiển thị fixture/demo như nội dung production.
- Tách dữ liệu truyện/chương khỏi dữ liệu phim/anime.
- Kiểm tra quyền đọc công khai và quyền ghi tối thiểu cần thiết.
- RLS phải được thử bằng vai trò khách, người dùng thường và quản trị viên.

## 6. Preview → Publish → Rollback và Published Theme Runtime
### Những gì được ghi nhận
- Visual Template Editor với thao tác kéo-thả.
- Luồng Preview → Publish → Rollback.
- Các bảng `rohub_templates` và `rohub_template_revisions`.
- RLS được đề cập cho dữ liệu quản trị template.
- PR #4 chưa có xác nhận merge tại mốc thông tin gần nhất.

### Khoảng trống kỹ thuật
Lưu một revision không đồng nghĩa website công khai đang dùng revision đó. Nếu public frontend đọc draft hoặc lấy bản mới nhất thay vì bản đã publish, thay đổi chưa công bố có thể rò ra người xem. Cache không được invalidation đúng cũng có thể khiến publish/rollback không hiện ra như mong đợi.

### Kiến trúc đích
- **Draft:** chỉ dùng trong editor/preview.
- **Published snapshot:** revision rõ ràng, bất biến hoặc được quản lý như snapshot; có trạng thái active công khai.
- **Public runtime:** chỉ đọc revision đã publish, không đọc draft.
- **Publish:** kiểm tra cấu hình, tạo revision và chuyển active published có kiểm soát.
- **Rollback:** chuyển public về revision ổn định đã chọn; giữ lịch sử kiểm toán.
- **Cache:** revalidate/invalidate sau publish và rollback.
- **Fallback:** theme lỗi/thiếu trường thì dùng theme mặc định an toàn, không trắng trang.
- **Authorization:** chỉ người có quyền mới sửa/publish/rollback; khách chỉ đọc dữ liệu public.

### Ma trận kiểm thử P0/P1
| Tình huống | Kết quả mong đợi | Ưu tiên |
|---|---|---|
| Sửa draft chưa publish | Khách vẫn thấy theme published trước đó | P0 |
| Preview trong editor | Chỉ editor thấy preview | P0 |
| Publish bản hợp lệ | Runtime chuyển sang revision mới | P0 |
| Rollback | Public quay về đúng revision đã chọn | P0 |
| Theme thiếu trường/lỗi | Fallback an toàn, không trắng trang | P0 |
| Khách gọi API draft | Không trả dữ liệu draft | P0 |
| Cache sau publish/rollback | Giao diện cập nhật theo chính sách cache | P1 |
| Hai lần publish đồng thời | Không tạo trạng thái active mơ hồ | P1 |

## 7. Kiến trúc logic
```text
ROHUB Gateway (intro điện ảnh)
  ├── ROFLIX: nội dung video / nguồn phát / chính sách 18+
  └── ROTRUYEN: truyện / chương / lịch sử đọc / yêu thích

Nền tảng chung: UI primitives / theme runtime / quản trị / xác thực phù hợp / quan sát lỗi
```

Ranh giới module/domain cần rõ. Theme schema và công cụ có thể dùng chung, nhưng từng app có palette/layout riêng. Các thay đổi rủi ro nên có feature flag hoặc branch riêng. Không được coi có nút UI hay bảng DB là bằng chứng tính năng đã chạy production.

## 8. Bảo mật và quyền truy cập
- RLS phải kiểm tra theo từng bảng, vai trò và thao tác.
- API công khai không trả draft, thông tin tài khoản hoặc trường nhạy cảm không cần thiết.
- Đăng truyện, publish và rollback phải được bảo vệ ở server/database, không chỉ ẩn nút trên frontend.
- Quy tắc 18+ phải nhất quán giữa giao diện, API và dữ liệu.
- Không commit khóa bí mật, token hay dữ liệu nhạy cảm.

## 9. Trạng thái tổng hợp tại 10/10/2026
| Hạng mục | Trạng thái theo thông tin hiện có | Việc cần xác minh |
|---|---|---|
| Định hướng ROHUB | Đã chốt | Đối chiếu routing và cấu trúc module |
| ROFLIX tìm/phát nguồn | Có lỗi được phản ánh; chưa có kết quả test cuối cùng trong báo cáo | Test thực tế nhiều title/browser |
| Chính sách đăng nhập ROFLIX | Yêu cầu đã chốt | Test khách, user thường và nội dung 18+ |
| ROTRUYEN MVP | Yêu cầu đã chốt; mức hoàn thiện từng màn hình cần kiểm tra repo | Rà soát danh mục, chi tiết, reader, dữ liệu thật |
| Template Editor | Được ghi nhận trong PR #4 | Kiểm tra PR, diff, CI và review |
| Publish/Rollback | Có luồng lưu revision; hiệu lực public chưa xác nhận | End-to-end test |
| Published Theme Runtime | Hạng mục cần hoàn thiện/xác minh | Public-only published revision, fallback, cache |
| Production deployment | Chưa có bằng chứng trong báo cáo | Kiểm tra URL, commit SHA và smoke test |

## 10. Rủi ro và phản biện kỹ thuật
1. **UI có nhưng nghiệp vụ chưa chạy:** nút Publish hoặc bảng revision không chứng minh runtime công khai đã đổi theme.
2. **Nền tảng chung bị coupling:** thay đổi ROTRUYEN có thể phá ROFLIX nếu route, auth, palette và logic bị hard-code lẫn nhau.
3. **Demo bị nhầm dữ liệu thật:** cần tách fixture theo môi trường.
4. **Bảo vệ chỉ ở frontend:** ẩn nút không bảo vệ API; phải kiểm tra quyền ở server/database.
5. **Rollback không hiệu lực:** nếu không đổi active revision hoặc cache không được xử lý, khách vẫn thấy theme lỗi.
6. **Tuyên bố hoàn tất quá sớm:** không có build/test/deployment evidence thì không nên gọi là production-ready.

## 11. Lộ trình ưu tiên
- **P0:** xác minh PR #4, nhánh, diff, CI và commit gần nhất.
- **P0:** hoàn thiện Published Theme Runtime: public chỉ đọc published; draft chỉ trong editor.
- **P0:** kiểm thử chu trình A → publish B → rollback A và xác nhận bằng phiên khách mới.
- **P0:** regression test ROFLIX: tìm nguồn, chọn nguồn, phát video và chính sách truy cập.
- **P1:** hoàn thiện ROTRUYEN MVP với dữ liệu thật.
- **P1:** rà soát RLS bằng tài khoản khách/người dùng/quản trị.
- **P1:** bổ sung log, thông báo lỗi và kiểm tra cache sau deploy.
- **P2:** cập nhật README, kiến trúc, quy trình phát hành theme và checklist rollback.

## 12. Checklist nghiệm thu trước khi công bố
- [ ] PR được review và CI xanh.
- [ ] Build production thành công trên commit dự kiến.
- [ ] Khách đọc truyện và xem nội dung ROFLIX thông thường không cần đăng nhập.
- [ ] Đăng nhập chỉ bắt buộc đúng ở tính năng cá nhân/nội dung 18+ theo chính sách.
- [ ] Không còn tác phẩm mẫu trong danh mục công khai.
- [ ] Draft theme không ảnh hưởng khách.
- [ ] Publish đổi theme công khai.
- [ ] Rollback khôi phục đúng revision.
- [ ] Public API không trả draft.
- [ ] Theme lỗi có fallback.
- [ ] Luồng ROFLIX cốt lõi vẫn hoạt động sau thay đổi.
- [ ] Production deployment được xác minh bằng URL và commit SHA.

## 13. Kết luận
ROHUB đang chuyển từ một ứng dụng nội dung sang hệ sinh thái ROFLIX + ROTRUYEN trên nền tảng chung. Các quyết định sản phẩm quan trọng đã rõ: phân tách nội dung theo app, dùng chung nền tảng, cho phép khách truy cập nội dung miễn phí theo chính sách và không để draft theme tác động người xem.

Nút thắt kỹ thuật quan trọng nhất tại mốc báo cáo là nối revision đã publish với giao diện công khai bằng Published Theme Runtime, đồng thời bảo đảm rollback có hiệu lực. Song song, cần xem luồng tìm/phát nguồn ROFLIX là vùng cần kiểm thử hồi quy.

**Báo cáo không tuyên bố toàn bộ hệ thống đã hoàn tất hoặc đang chạy production.** Trước phát hành, cần xác minh trực tiếp PR/commit, CI, database policies và deployment.

## Phụ lục: nguồn/mốc
- Repository: https://github.com/HOANGJKERD/roflix-hub
- PR #4 và Template Editor: theo thông tin làm việc gần nhất ngày 10/10/2026; cần xác minh trạng thái trực tiếp trên GitHub.
- Các quyết định sản phẩm: tổng hợp từ các trao đổi của dự án.
