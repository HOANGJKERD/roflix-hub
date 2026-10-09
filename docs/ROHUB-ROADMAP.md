# RoHub / RoTruyen Roadmap

## Muc tieu
Tao RoTruyen thanh ung dung doc lap, dung chung ngon ngu thiet ke RoFlix/RoHub nhung khong phu thuoc runtime RoFlix.

## Nguyen tac
- Giu nguyen index.html, cac script RoFlix va thu tu nap trong giai doan dau.
- rotruyen.html la entry point rieng; CSS/JS nam trong css/rotruyen/ va js/rotruyen/.
- Khong nap module RoFlix trong RoTruyen.
- Khong dat token bi mat trong frontend.
- Admin chi thao tac qua backend co xac thuc va phan quyen server-side. Khoa chuot phai/F12 khong phai ranh gioi bao mat.
- Lam tren nhanh rieng, preview va hoi quy RoFlix truoc khi merge.

## Danh gia nguon
### TruyenDex
https://github.com/zennomi/truyendex
README tren nhanh develop cho biet phat trien chinh thuc da dung, website TruyenDex.cc van duoc duy tri. Du an mo ta viec dung API MangaDex va cam ket khong dat quang cao/kiem loi tu du lieu MangaDex, ghi nguon nhom dich va ton trong quyen tu quyet cua nhom dich. Chua bat endpoint live; can xac minh dieu khoan hien hanh, attribution va mo hinh doanh thu. License metadata khong khai bao; khong sao chep ma nguon.

### LongBookApi
https://github.com/ALPhaHoai/LongBookApi
README mo ta REST API Java Jersey/MySQL, GET danh sach/chi tiet va CRUD can authentication. Metadata khong khai bao license; can kiem tra kha nang chay, schema va xac thuc truoc khi su dung. Khong goi ghi du lieu tu client trong MVP.

## Da trien khai trong nhanh foundation\n- Cong RoHub: `index.html` la gateway; `roflix.html` giu ban sao entry point RoFlix; `rohub.html` la route gateway thay the.\n- RoTruyen co trang catalog, tim kiem/loc, dialog chi tiet, MangaDex public API, danh sach chuong/doc anh, lich su va bookmark local.\n- Adapter catalog Supabase doc tac pham da xuat ban; LongBook co adapter co the cau hinh nhung can endpoint live va schema phu hop.\n- Trang admin rieng voi login Supabase, kiem tra role profiles, CRUD catalog/chapter, settings va audit log.\n- Migration RLS va service worker duoc cap nhat de cache dung route, khong cache trang admin.\n\n## Cac giai doan
1. Foundation: HTML/CSS/JS rieng, catalog UI, tim kiem/loc phia client voi du lieu minh hoa co ghi ro.
2. Data adapters: chon nguon sau khi xac minh license, dieu khoan, API contract va gioi han toc do.
3. Detail + reader: chi tiet, danh sach chuong, doc responsive, dieu huong va lich su doc.
4. Admin backend: auth, phan quyen server-side, audit log, validation, rate limit, CSRF khi phu hop, xac nhan thao tac pha huy va backup/restore.
5. Integration: cong RoHub, cache/service worker, test route va hoi quy RoFlix.

## Kiem thu truoc merge
- / va /index.html van giu RoFlix hien tai.
- /rotruyen.html chay doc lap, khong can script RoFlix.
- Tim kiem, loc, reset va responsive hoat dong.
- Ton trong prefers-reduced-motion.
- API loi khong lam treo trang.
- Admin khong duoc ghi neu backend chua xac thuc quyen.
- Kiem tra service worker va cache HTML.
- Khong merge/production truoc khi hoi quy RoFlix.

## Trang thai
- Foundation: dang trien khai.
- API live: chua bat, can xac minh dieu khoan/giay phep.
- Admin CRUD that: chua bat, can backend authorization.
