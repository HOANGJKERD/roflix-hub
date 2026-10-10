# 🌌 RoHUB — Một hệ sinh thái, nhiều cách khám phá

<p align="center">
  <strong>RoFlix · RoTruyện · RoHub Admin · RoHub Studio</strong><br>
  <em>Được xây dựng từng bước bằng sự tò mò, thử nghiệm và mong muốn tạo ra một sản phẩm của riêng mình.</em>
</p>

<p align="center">
  <a href="https://github.com/HOANGJKERD/roflix-hub"><img src="https://img.shields.io/badge/Project-RoHUB-8b5cf6?style=for-the-badge" alt="RoHUB project"></a>
  <img src="https://img.shields.io/badge/Language-Vietnamese-ef4444?style=for-the-badge" alt="Vietnamese">
  <img src="https://img.shields.io/badge/Status-Developing-f59e0b?style=for-the-badge" alt="In development">
</p>

> **RoHUB không chỉ là một website. Đây là hành trình thử xây dựng một hệ sinh thái số của riêng mình:** bắt đầu từ trải nghiệm giải trí trên web, mở rộng sang đọc truyện, rồi tiến tới một trung tâm quản trị có thể điều khiển giao diện và nội dung của nhiều nền tảng.

---

## 📖 Mục lục

- [Xin chào, mình là ai?](#-xin-chào-mình-là-ai)
- [RoHUB là gì?](#-rohub-là-gì)
- [Hai nền tảng chính](#-hai-nền-tảng-chính)
- [Hành trình phát triển](#-hành-trình-phát-triển)
- [RoHub Admin và RoHub Studio](#-rohub-admin-và-rohub-studio)
- [Định hướng kỹ thuật](#-định-hướng-kỹ-thuật)
- [Lộ trình phát triển](#-lộ-trình-phát-triển)
- [Triết lý thiết kế](#-triết-lý-thiết-kế)
- [Trạng thái dự án và tính minh bạch](#-trạng-thái-dự-án-và-tính-minh-bạch)
- [Tham gia và góp ý](#-tham-gia-và-góp-ý)
- [Lời kết](#-lời-kết)

---

## 👋 Xin chào, mình là ai?

Mình là **HOANGJKERD**, người khởi xướng và trực tiếp phát triển RoHUB.

Mình thích khám phá cách website được xây dựng, thử nghiệm ý tưởng sản phẩm và biến những mong muốn còn nằm trên giấy thành các tính năng có thể tương tác. RoHUB là nơi mình kết hợp những điều đó: giao diện, trải nghiệm người dùng, logic ứng dụng, dữ liệu, công cụ quản trị và quá trình cải tiến liên tục.

Mình không xem việc làm ra một trang web có thể mở được là đích đến. Điều mình muốn là hiểu một sản phẩm vận hành như thế nào: người dùng tìm nội dung ra sao, dữ liệu được quản lý thế nào, quyền truy cập được bảo vệ ra sao, và làm thế nào để cập nhật một tính năng mà không làm hỏng những thứ đã hoạt động.

### Vì sao mình bắt đầu RoHUB?

- 🚀 **Tự tay xây dựng:** học bằng cách thiết kế, viết code, thử nghiệm và sửa lỗi trên một dự án thực tế.
- 🧩 **Kết nối nhiều trải nghiệm:** đưa các sản phẩm có mục đích khác nhau về chung một hệ sinh thái.
- 🎨 **Chăm chút giao diện:** giao diện cần có cá tính, nhưng cũng phải dễ hiểu, nhất quán và sử dụng thuận tiện.
- 🛠️ **Xây tính năng thật:** hướng tới dữ liệu thật, phân quyền rõ ràng và những thao tác thực sự có tác dụng.
- 🌱 **Phát triển lâu dài:** ưu tiên nền móng có thể mở rộng thay vì chỉ tạo một bản demo bắt mắt.

RoHUB vẫn đang phát triển. Mình muốn repository này phản ánh đúng quá trình đó: có những phần đã được viết, có những phần đang thử nghiệm và có những mục tiêu vẫn còn ở phía trước.

---

## 🌐 RoHUB là gì?

**RoHUB** là tên gọi chung của hệ sinh thái gồm các website và công cụ quản trị được phát triển trong repository này.

| Thành phần | Vai trò |
|---|---|
| **RoFlix** | Trải nghiệm khám phá và xem nội dung phim |
| **RoTruyện** | Nền tảng khám phá và đọc truyện, hướng tới các tính năng tài khoản và cộng đồng |
| **RoHub Admin** | Trung tâm quản trị tập trung cho các nền tảng |
| **RoHub Studio** | Định hướng công cụ tùy biến theme và template, xem trước và quản lý phiên bản giao diện |

Mục tiêu dài hạn là để các thành phần có thể chia sẻ những nguyên tắc thiết kế và công cụ quản trị chung, nhưng vẫn giữ được trải nghiệm phù hợp với từng sản phẩm.

## 🎬 Hai nền tảng chính

### 🍿 RoFlix — Khám phá thế giới phim

RoFlix là nhánh tập trung vào trải nghiệm phim. Dự án hướng tới việc giúp người dùng khám phá nội dung và tiếp cận trang xem phim thông qua một giao diện trực quan.

Những khu vực chức năng được định hướng hoặc đang phát triển trong hệ thống gồm:

- Trang khám phá nội dung phim.
- Các trang thông tin và luồng xem phim.
- Tìm kiếm, phân loại và điều hướng nội dung.
- Tài khoản và các công cụ quản trị.
- Dashboard theo dõi tình trạng hệ thống và dữ liệu hoạt động.

> Lưu ý: danh sách trên mô tả phạm vi sản phẩm, không phải cam kết rằng mọi tính năng đều đã hoàn thiện hoặc hoạt động ổn định trong môi trường production.

### 📚 RoTruyện — Một không gian dành cho người đọc truyện

RoTruyện được phát triển như nhánh truyện của RoHUB. Định hướng không dừng lại ở danh sách bìa truyện: trải nghiệm mong muốn bao gồm khám phá, đọc, quản lý thư viện cá nhân và từng bước mở rộng sang cộng đồng.

Các nhóm tính năng mục tiêu:

- **Khám phá:** trang chủ, truyện nổi bật, truyện mới, truyện cập nhật và bảng xếp hạng.
- **Tìm kiếm nâng cao:** tìm theo tên hoặc mã; lọc thể loại bao gồm và loại trừ; lọc trạng thái; sắp xếp và phân trang.
- **Đọc truyện:** trang chi tiết, danh sách chương và giao diện đọc phù hợp với nhiều kích thước màn hình.
- **Tài khoản:** đăng nhập, đăng ký, hồ sơ, lịch sử đọc, truyện theo dõi và danh sách yêu thích.
- **Đăng truyện:** thông tin truyện, ảnh bìa, metadata, chương, bản nháp và quy trình duyệt.
- **Cộng đồng:** bình luận, báo cáo nội dung và các hoạt động dành cho thành viên.
- **Gamification:** điểm kinh nghiệm, cấp bậc, thành tích, điểm danh và trò chơi ghép hình.
- **Quản trị:** quản lý truyện, chương, trạng thái xuất bản và hoạt động kiểm duyệt.

Những tính năng này không nhất thiết đã hoàn tất cùng lúc. Chúng là phạm vi phát triển để RoTruyện tiến dần từ một website đọc truyện thành một nền tảng có nhiều trải nghiệm liên kết với nhau.

### 🔗 Truy cập mã nguồn

- [Repository RoHUB trên GitHub](https://github.com/HOANGJKERD/roflix-hub)
- [Trang chọn nền tảng](./index.html)
- [RoFlix](./roflix.html)
- [RoTruyện](./rotruyen.html)
- [RoHub Admin](./admin.html)
- [RoHub Studio](./rohub-studio.html)

Các liên kết trên trỏ tới tệp trong repository. Việc có tệp trong GitHub không tự động có nghĩa website đã được deploy hoặc tính năng đã được kiểm thử trên môi trường đang chạy.

---

## 🧭 Hành trình phát triển

RoHUB phát triển theo hướng mở rộng dần: từ các trang web riêng lẻ, sang trải nghiệm có dữ liệu, rồi tới công cụ quản trị và tùy biến tập trung. Đây là bản tóm tắt theo các giai đoạn phát triển, không phải nhật ký đầy đủ của từng commit.

### Giai đoạn 1 — Đặt nền móng cho RoHUB

**Mục tiêu:** tổ chức các nhánh sản phẩm thành một điểm vào chung.

- Xây dựng trang chọn giữa RoFlix và RoTruyện.
- Tách trải nghiệm của từng nền tảng thành các trang riêng.
- Giữ cấu trúc để tiếp tục bổ sung giao diện và tính năng mà không biến trang đầu thành một ứng dụng duy nhất quá phức tạp.

### Giai đoạn 2 — Phát triển trải nghiệm RoTruyện

**Mục tiêu:** tạo nền tảng cho nội dung truyện và trải nghiệm đọc.

- Xây dựng trang RoTruyện và stylesheet riêng.
- Phát triển các thành phần hiển thị nội dung truyện.
- Định hướng tích hợp dữ liệu truyện, chương và nguồn.
- Bắt đầu tổ chức luồng tài khoản dành cho RoTruyện.

### Giai đoạn 3 — Đưa quản trị vào cùng một hệ thống

**Mục tiêu:** giảm việc phải quản lý từng sản phẩm theo những cách hoàn toàn khác nhau.

- Phát triển RoHub Admin dựa trên phong cách dashboard tối của RoFlix Admin.
- Bổ sung khu vực quản lý nội dung RoTruyện.
- Hướng tới quản lý dữ liệu, tài khoản, hoạt động và các trạng thái nội dung từ một trung tâm.
- Phân biệt rõ giao diện quản trị với trải nghiệm người dùng thông thường.

### Giai đoạn 4 — Từ chỉnh giao diện sang quản lý theme

**Mục tiêu:** cho phép tùy biến giao diện một cách có tổ chức.

RoHub Studio được định hướng như bước tiến từ việc sửa CSS thủ công sang quản lý theme và template:

- Tùy chỉnh màu nhấn, màu nền, màu thẻ, độ bo góc và mật độ giao diện.
- Xem trước giao diện trước khi áp dụng.
- Nhập và xuất cấu hình theme dạng JSON.
- Tổ chức các mẫu cho header, footer và nhiều loại trang.
- Quản lý bản nháp và phiên bản đã xuất bản.
- Hướng tới lịch sử thay đổi và khả năng khôi phục phiên bản trước.

### Giai đoạn 5 — Tách bản nháp khỏi giao diện đang xuất bản

**Mục tiêu:** tránh để một thay đổi chưa hoàn chỉnh ảnh hưởng người xem.

Nguyên tắc kiến trúc đang hướng tới:

1. Quản trị viên chỉnh sửa bản nháp.
2. Bản nháp được xem trước độc lập.
3. Quản trị viên xác nhận xuất bản.
4. Website chỉ đọc cấu hình đã xuất bản.
5. Khi phiên bản mới có vấn đề, quản trị viên có thể khôi phục phiên bản ổn định trước đó.

Đây là nguyên tắc quan trọng của RoHub Studio. Việc hoàn thành nó cần cả giao diện quản trị, lưu phiên bản, quyền truy cập dữ liệu và runtime trên website. Không nên xem một nút “Publish” hoặc “Rollback” trên giao diện là bằng chứng rằng toàn bộ quy trình đã an toàn.

### Giai đoạn 6 — Mở rộng RoTruyện thành nền tảng cộng đồng

**Mục tiêu:** phát triển các trải nghiệm được gợi ý từ nghiên cứu giao diện website truyện, đồng thời xây dựng thiết kế và cách triển khai phù hợp với RoTruyện.

Các hướng đang được ưu tiên gồm:

- Bộ lọc tìm kiếm nâng cao.
- Hồ sơ cá nhân và lịch sử đọc.
- Truyện theo dõi và thư viện cá nhân.
- Luồng đăng truyện, quản lý chương và kiểm duyệt.
- Trò chơi ghép hình, điểm thưởng và thành tích.
- Quản trị báo cáo, nhật ký và quyền của người dùng.

Các mục này là lộ trình phát triển; tình trạng triển khai cần được xác minh theo từng tính năng.

---

## 🧰 RoHub Admin và RoHub Studio

### Một trung tâm quản trị cho nhiều sản phẩm

Mục tiêu của RoHub Admin là giúp quản trị viên quản lý RoFlix và RoTruyện trong cùng một khu vực, nhưng không trộn lẫn dữ liệu hoặc quyền hạn giữa các tính năng.

Những nhóm công cụ được định hướng gồm:

- Tổng quan hệ thống và dữ liệu.
- Quản lý tài khoản, vai trò và trạng thái tài khoản.
- Quản lý nội dung phim và truyện.
- Kiểm duyệt và xử lý báo cáo.
- Nhật ký thao tác.
- Cấu hình giao diện và template.

### Theme Builder và Template Builder

Một theme xác định các thuộc tính giao diện như màu sắc, nền và độ bo góc. Một template xác định cấu trúc và cách sắp xếp các thành phần trên một loại trang. RoHub Studio hướng tới việc quản lý cả hai.

Các loại template mục tiêu:

- Header và Footer.
- Trang chủ.
- Trang chi tiết nội dung.
- Trang đăng nhập và đăng ký.
- Trang danh mục, tìm kiếm và 404.
- Các khối nội dung có thể sắp xếp trong bố cục.

Về lâu dài, trình chỉnh sửa nên hỗ trợ thêm, xóa, sắp xếp và cấu hình từng khối; xem trước ở nhiều kích thước màn hình; lưu lịch sử và khôi phục phiên bản.

### Bảo mật và độ tin cậy

Một trung tâm quản trị thực sự cần nhiều hơn giao diện đẹp:

- Xác thực danh tính và kiểm tra quyền ở phía máy chủ.
- Chính sách RLS phù hợp khi dùng Supabase.
- Không đặt khóa bí mật hoặc quyền đặc biệt trong mã frontend.
- Lưu lịch sử phiên bản và người thực hiện thay đổi.
- Kiểm tra cấu hình trước khi xuất bản.
- Có phương án dự phòng nếu cấu hình mới lỗi.
- Không hiển thị trạng thái thành công nếu thao tác lưu thực tế thất bại.

---

## 🧱 Định hướng kỹ thuật

Repository hiện có các trang HTML, stylesheet CSS và mã JavaScript phía trình duyệt. Một số phần của hệ thống được thiết kế để làm việc với Supabase. Cấu hình triển khai thực tế có thể thay đổi trong quá trình phát triển.

| Thành phần | Vai trò |
|---|---|
| **HTML** | Cấu trúc trang và các khu vực giao diện |
| **CSS** | Màu sắc, bố cục, hiệu ứng và responsive |
| **JavaScript** | Tương tác giao diện, điều hướng và logic phía client |
| **Supabase** | Hướng tích hợp xác thực và dữ liệu cho các tính năng cần backend |
| **GitHub** | Lưu mã nguồn, theo dõi thay đổi và cộng tác |
| **RoHub Studio** | Công cụ quản lý theme/template đang được phát triển |

### Một số nguyên tắc kỹ thuật

1. **Không tin tưởng dữ liệu từ trình duyệt:** quyền quản trị và các thao tác nhạy cảm phải được xác minh phía máy chủ.
2. **Tách bản nháp và bản xuất bản:** khách truy cập không nên thấy các thay đổi chưa được phê duyệt.
3. **Có khả năng khôi phục:** thay đổi giao diện cần có lịch sử và quy trình rollback có kiểm chứng.
4. **Giữ tương thích:** tính năng mới không được tùy tiện phá vỡ luồng truy cập hiện tại.
5. **Xử lý lỗi có chủ đích:** khi dữ liệu không tải được, giao diện cần báo lỗi rõ ràng hoặc sử dụng trạng thái dự phòng an toàn.
6. **Ưu tiên dữ liệu thật:** không dùng số liệu hoặc trạng thái giả để khiến một tính năng trông như đã hoạt động.

---

## 🗺️ Lộ trình phát triển

Đây là các ưu tiên dự kiến. Thứ tự có thể thay đổi tùy kết quả kiểm thử và tình trạng backend.

- [ ] Kiểm tra luồng truy cập chính của RoFlix và RoTruyện.
- [ ] Hoàn thiện tìm kiếm và bộ lọc nâng cao của RoTruyện.
- [ ] Hoàn thiện trải nghiệm tài khoản, lịch sử đọc và theo dõi truyện.
- [ ] Xây dựng quy trình đăng truyện, quản lý chương và kiểm duyệt.
- [ ] Hoàn thiện quản lý nguồn truyện và xử lý chương lỗi.
- [ ] Hoàn thiện RoHub Admin để quản lý tập trung.
- [ ] Hoàn thiện Template Builder với các khối có thể kéo thả.
- [ ] Kiểm thử đầy đủ chu trình Draft → Preview → Publish → Runtime → Rollback.
- [ ] Xác minh chính sách Supabase RLS và quyền truy cập cho từng vai trò.
- [ ] Bổ sung kiểm thử hồi quy cho các luồng quan trọng.
- [ ] Hoàn thiện tài liệu cài đặt, cấu hình và triển khai.

---

## 🎨 Triết lý thiết kế

### Giao diện có cá tính, nhưng không đánh đổi khả năng sử dụng

RoFlix Admin là nguồn cảm hứng cho phong cách quản trị: nền tối, tương phản rõ, thẻ nội dung bo góc và màu nhấn amber/vàng kết hợp tím. RoTruyện có thể giữ sắc thái riêng cho trải nghiệm đọc, nhưng các công cụ quản trị nên có ngôn ngữ thiết kế thống nhất.

### Tính năng phải có hành vi thật

Một nút bấm không nên chỉ tồn tại để trang trông đầy đủ. Nếu tính năng chưa có API hoặc chưa kết nối dữ liệu, trạng thái đó phải được ghi rõ. Đây là tiêu chuẩn quan trọng để phân biệt một bản thiết kế, một prototype và một tính năng sẵn sàng sử dụng.

### Phát triển từng bước, không bỏ quên nền móng

RoHUB được xây dựng theo hướng học hỏi qua thực hành. Vì vậy, việc sửa lỗi, xem lại quyết định kỹ thuật, cải thiện bảo mật và viết tài liệu đều là một phần của sản phẩm, không phải công việc phụ.

---

## 📌 Trạng thái dự án và tính minh bạch

RoHUB đang trong quá trình phát triển. Một số trang và thành phần quản trị đã tồn tại trong repository; những phần khác vẫn là mục tiêu hoặc cần kiểm thử thêm.

- **Có mã nguồn** không đồng nghĩa với **đã kiểm thử**.
- **Đã commit lên GitHub** không đồng nghĩa với **đã triển khai production**.
- **Có giao diện quản trị** không đồng nghĩa với **backend và phân quyền đã hoàn chỉnh**.
- **Có nút Publish/Rollback** không đồng nghĩa với **runtime đã đọc đúng phiên bản và khôi phục an toàn**.

README này mô tả mục tiêu, cấu trúc và hành trình phát triển của dự án; không phải chứng nhận rằng mọi tính năng đã hoàn thiện.

### Nội dung và quyền sử dụng

RoHUB hướng tới việc tổ chức trải nghiệm khám phá nội dung và xây dựng công cụ quản lý. Khi tích hợp hình ảnh, metadata hoặc nguồn nội dung bên ngoài, cần tôn trọng quyền của chủ sở hữu, điều khoản của nguồn và quy định áp dụng. Không nên mặc định rằng nội dung có thể được sao chép hoặc phân phối lại chỉ vì có thể truy cập được trên Internet.

---

## 🤝 Tham gia và góp ý

Nếu bạn muốn góp ý cho RoHUB:

1. Mở [repository trên GitHub](https://github.com/HOANGJKERD/roflix-hub).
2. Kiểm tra các tệp liên quan và tình trạng hiện tại trước khi đề xuất thay đổi.
3. Mô tả vấn đề, các bước tái hiện, kết quả mong đợi và kết quả thực tế.
4. Với đề xuất tính năng, hãy giải thích người dùng nào sẽ hưởng lợi và dữ liệu/backend nào cần có.
5. Với lỗi bảo mật, không công khai thông tin nhạy cảm hoặc bí mật truy cập trong issue.

Các ý kiến giúp dự án tốt hơn, đặc biệt là phản hồi có thể tái hiện và kiểm chứng.

---

## 💜 Lời kết

RoHUB bắt đầu từ một ý tưởng, nhưng tham vọng của nó là lớn hơn một trang web đơn lẻ: **xây dựng một hệ sinh thái có trải nghiệm riêng, công cụ quản trị tập trung và nền tảng kỹ thuật có thể phát triển lâu dài.**

RoFlix đại diện cho nhánh phim. RoTruyện mở rộng sang thế giới truyện và các trải nghiệm cộng đồng. RoHub Admin và RoHub Studio là nỗ lực đưa việc quản lý nội dung, giao diện và phiên bản về một nơi có tổ chức.

Mọi thứ chưa hoàn hảo, và hành trình vẫn đang tiếp diễn. Mỗi commit là một bước tiến; mỗi lỗi được tìm ra là một cơ hội để hiểu hệ thống sâu hơn; mỗi tính năng hoàn thành cần được kiểm chứng bằng hành vi thực tế.

Cảm ơn bạn đã ghé thăm repository. 🌌

<p align="center">
  <strong>RoHUB — Built step by step. Improved with every iteration.</strong>
</p>
