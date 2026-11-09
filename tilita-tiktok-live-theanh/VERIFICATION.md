# Thư viện nhạc nền và lệnh chạy nhanh — 02/11/2026

- `npm test`: **42/42 đạt**. Kiểm tra danh sách chỉ gồm file có thật, thêm bài rồi quét lại không cần restart, tên tiếng Việt, từ chối đường dẫn vượt thư mục nhạc, tải MP3 theo Range và lưu đổi qua cả 5 bài mà vẫn giữ âm lượng 1%.
- Có hai bản niệm Phật local và ba bản không lời tạo riêng: Sen tĩnh, Trúc an, Mây thiền. Ba bản mới đều giải mã đầy đủ; mức đo khoảng −25 LUFS, true peak dưới −13 dB. Báo cáo: `output/audio/music-quality.json`.
- Admin đổi/lưu nhạc ngay khi chọn, có nút cập nhật danh sách; chỉ màn phát chính phát tiếng. Mức âm lượng và file đang dùng trong cấu hình thật được giữ nguyên. Không thao tác OBS hoặc chạy thử vào phiên thật trong đợt sửa này.
- `start.cmd` tự đặt cổng 3001 và dùng `output/qa-v2/data`, giữ cửa sổ server mở và mở admin khi sẵn sàng. Cần dừng server cũ rồi chạy lại để nạp code mới.

## Kiểm tra bộ xăm 99 lời — 02/11/2026

- `npm test`: **40/40 đạt**, gồm kiểm tra catalog 99 mục, đủ audio đúng phiên bản, timeline giữ thẻ 1,5 giây sau đoạn đọc, API và file WAV của quẻ 99.
- Catalog, manifest và thư mục phát đều có đúng **99 mục/file**, đánh số liên tục 1–99, không trùng ID, tiêu đề, thơ hoặc diễn giải. 24 mục cũ giữ nguyên.
- Đã kiểm tra waveform toàn bộ 99 file: mono PCM 16 bit, 48 kHz; thời lượng khớp manifest, dài 7,411–13,221 giây, không có mẫu bị clipping. Lời đọc được đối chiếu bằng nhận dạng tiếng Việt local; đã tạo lại quẻ 28 bị đọc thiếu.
- Nhóm số 100 trở lên và báo cáo thử tương ứng đã được chuyển ra khỏi thư mục phát, vào `output/fortune-expansion/unused-100-plus`. Catalog và các file bổ sung không còn quẻ từ 100 trở lên.
- Báo cáo cuối: `output/fortune-expansion/catalog-check-99.json`, `narration-audit-99.json`. Hướng dẫn: `docs/BO-XAM-99.md`.
- Server đang mở vẫn giữ bộ 24 đã nạp. Cần khởi động lại server và tải lại admin vào lúc phù hợp để dùng bộ 99. Không restart hoặc chạy mô phỏng trong phiên của người dùng khi thực hiện đợt cập nhật này.

## Nhật ký kiểm tra bản local 0.1.0

Ngày kiểm tra: 01/11/2026. Môi trường: Windows, Node.js 24.20.0.

- `npm test`: **24/24 đạt**, gồm kiểm tra lõi, top phiên LIVE, kịch bản và HTTP/WebSocket trên cổng loopback tạm.
- Dữ liệu giả theo schema v3 trong dependency thực: `gift.type`, `common.msgId`, `groupId: "0"`, `user.avatarThumb.urlList`. Hai quà không combo có mã sự kiện khác nhau không bị gộp nhầm.
- Trình duyệt: trang quản lý, preview và overlay tải được, không có lỗi console. Kiểm tra 1440px và 375px; trang luật không tràn ngang.
- Bấm Combo x5 trong quản lý: overlay chạy một lượt, lịch sử báo hoàn tất x5; tổng quà thật vẫn 0.
- Bấm Bật tiếng: AudioContext chuyển sang running; trang quản lý nhận trạng thái âm thanh. Chưa xác nhận tiếng thực qua loa/OBS.
- Lưu luật qua UI thành công; khởi động lại server đọc lại đủ 5 luật, không khôi phục lượt demo cũ.
- File dữ liệu hỏng không bị ghi đè; cấu hình hợp lệ được ghi qua file tạm và đọc lại trong kiểm thử.
- Preview không lấy lượt; xác nhận hoàn tất quá sớm hoặc từ preview bị bỏ qua; mất overlay đánh dấu lượt gián đoạn.

Ảnh kiểm tra nằm trong `output/playwright/` (không đưa vào Git).

## Còn cần kiểm tra với người dùng

- Quyền LIVE/nhận quà và đường phát OBS hoặc LIVE Studio trên kênh thực.
- Nhận comment và combo quà thực từ đúng kênh đang LIVE. Chưa có username hoặc phòng LIVE thật được dùng để kiểm tra.
- Chất lượng âm thanh qua OBS và bản ghi/phát thử; độ ổn định trong một buổi LIVE dài.

Không coi việc simulator chạy được là bằng chứng kết nối TikTok thật đã hoạt động.

## Top phiên và kịch bản riêng

- Top 16 theo tổng xu; kiểm tra 20 người đóng góp, thay đổi thứ hạng, hòa điểm cùng mili giây, một người không chiếm nhiều ghế.
- Room ID mới làm mới top, reconnect và khởi động lại cùng room giữ top; thống kê tích lũy không bị xóa. Quà mô phỏng và quà thiếu giá trị không tự chiếm ghế thật.
- Kiểm tra trình duyệt trên server riêng :3001 với top mẫu: 16 người có tên/avatar dự phòng/hạng/xu; nhãn TOP MÔ PHỎNG; khi không có dữ liệu thì 16 chỗ trống.
- Chạy đủ 7 kịch bản: các đạo cụ/lớp tương ứng xuất hiện; đại lễ cho 16 người cùng lạy và 8 đèn sáng, các cảnh khác không làm cả hàng ghế lạy.
- Console không có lỗi; ảnh minh họa tại output/playwright/top16-idle.png và ritual-*.png. Chưa dùng quà thật để kiểm tra bảng phiên.

## Thay bộ hình chùa gỗ / áo nâu

- Đã kích hoạt hai ảnh mới trong public/assets/wooden-temple-v1; cả nhân vật chính và 16 người ngồi hai bên dùng sheet mới.
- Căn từng tư thế trên cùng mặt đất, giữ kích thước nguồn thống nhất. Nền, khung nhân vật và tọa độ khói được căn lại theo bàn thờ/đệm mới.
- Kiểm tra trong trình duyệt 540 × 960: đi lên đệm, quỳ, chắp tay, lạy; combo x5 hoàn tất một lượt, thống kê quà thật bằng 0.
- Thả đèn, xin xăm và đại lễ hiện đúng lớp hiệu ứng; không còn ảnh nhân vật cũ trong DOM. Console không có lỗi.
- Chạy thử trên server riêng cổng 3001, không xóa hoặc tiêu thụ hàng chờ của phiên đang mở cổng 3000.
- Không sửa mã tổng hợp chuông/mõ, nhạc nền hoặc luật quà. Chạy lại 18 kiểm thử sau cập nhật tài nguyên.
- Ảnh minh họa mới: output/playwright/wooden-idle.png, wooden-walk.png, wooden-kneel.png, wooden-bow.png.
