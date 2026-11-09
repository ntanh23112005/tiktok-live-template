# Tài nguyên tham khảo

- Bộ cảnh đang dùng: `public/assets/wooden-temple-v1/background.png` và `devotee-sheet.png`, tạo mới bằng ImageGen theo yêu cầu người dùng. Nhân vật được hiển thị trực tiếp từ sheet trong suốt; tọa độ khung/chân được căn trong `public/js/temple-art.js`. Prompt gốc nằm ở `output/imagegen/wooden-temple-v1/PROMPTS.md` và không phải dependency runtime.

- Các ảnh cũ `public/assets/amitabha_stage.png`, `devotee*.png` (hiện không được overlay sử dụng) và engine hạt `public/js/particles.js` được lấy từ bản clone local của [zane-tv/tiktok-live-temple-rpc](https://github.com/zane-tv/tiktok-live-temple-rpc), theo yêu cầu người dùng. Giữ repo nguồn nguyên vẹn. Bản clone không có file LICENSE tại thời điểm khảo sát; cần xác định điều kiện sử dụng các tài nguyên này trước khi phân phối công khai.
- `tiktok-live-connector` 2.5.0 và `tiktok-live-proto`: AGPL-3.0-only theo metadata của các package được cài. Tham khảo LICENSE trong package và [dự án connector](https://github.com/zerodytrash/TikTok-Live-Connector).
- Express: MIT. ws: MIT. Các dependency bắc cầu giữ thông tin giấy phép trong package tương ứng.
- Tool sử dụng kết nối không chính thức để đọc sự kiện LIVE, không liên kết với TikTok. Không lấy tài nguyên hay code từ app Farm.

Không đóng gói nhạc nền hoặc giọng đọc. Font quản lý dùng font hệ thống, không gọi dịch vụ font bên ngoài.

## Nhạc local đã thiết lập trên máy

Theo yêu cầu dùng giọng tụng cơ bản, ngày 01/11/2026 đã đổi nhạc local thành **Niệm Nam Mô A Di Đà Phật — Thầy Thích Chúc Thiện**, từ [Đạo Tràng Liên Hoa](https://www.daotranglienhoa.com/niem-phat/), lưu tại `public/assets/music.mp3`.

- URL tải do trang nguồn cung cấp: https://www.daotranglienhoa.com/wp-content/uploads/2019/12/niem_nam_mo_a_di_da_phat_thay_chuc_thien_1.mp3
- File 15.670.578 byte, thời lượng khoảng 65 phút 18 giây. Bản phối nhạc trước đó của Chùa Giác Ngộ được giữ tại output/audio/nhac-niem-phoi-khi.mp3, không phải bài đang phát.
- Thiết lập cá nhân tiếp tục giữ bài và mức âm lượng đã chọn trong admin; nguồn phát chính tự lặp bài. File nhạc vẫn được `.gitignore` loại khỏi source khi chia sẻ.
- Đây là bản tải công khai từ trang nguồn, không có tuyên bố rằng bản ghi thuộc public domain hoặc có giấy phép mở.

## Thư viện 5 bài — 02/11/2026

- `music.mp3`: bản niệm Phật của Thầy Thích Chúc Thiện nêu trên, giữ nguyên file hiện có.
- `music/niem-phat-phoi-khi.mp3`: sao chép từ bản phối khí đã có tại `output/audio/nhac-niem-phoi-khi.mp3` trên máy, không tải thêm bản ghi bên ngoài trong lần cập nhật này.
- `music/sen-tinh.mp3`, `music/truc-an.mp3`, `music/may-thien.mp3`: ba bản nhạc nền không lời soạn và tổng hợp riêng bằng `scripts/prepare-ambient-music.py`. Dùng các nốt, hòa âm và tiếng chuông/sáo/đệm tổng hợp; không dùng sample hoặc giai điệu từ bản ghi bên ngoài. Mỗi bản 192 giây; âm lượng được xử lý trước ở mức nền nhẹ.
- FFmpeg được dùng để mã hóa MP3 lúc chuẩn bị file; không cần FFmpeg hoặc Python khi phát LIVE. Nhãn bài nằm tại `config/music.json`; file thêm sau hiện theo tên file.
