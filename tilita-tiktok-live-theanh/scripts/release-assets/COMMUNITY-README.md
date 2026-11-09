# Tâm an lạc — Community preview

Web tương tác TikTok LIVE chạy trên máy cá nhân. Đây là bản mã nguồn để duyệt trước khi phát hành công khai; đọc `RELEASE-REVIEW.md` về giấy phép và trạng thái kiểm thử.

## Máy mới cần cài gì?

- Node.js **24 LTS**, có kèm npm: https://nodejs.org/en/download . Chọn bộ cài đúng Windows/macOS và loại CPU của máy.
- Trình duyệt Chrome, Edge hoặc Safari để mở admin.
- OBS Studio nếu muốn ghép cảnh vào buổi phát: https://obsproject.com/download . Chỉ thử giao diện thì chưa cần OBS.
- Internet cho lần đầu cài dependency và khi nhận tương tác TikTok thật.

Không cần Python, Bun, FFmpeg, tài khoản TTS, database, hosting hay tên miền để chạy. Giọng đọc và ba bài nhạc không lời đã là file sẵn trong gói. Các script Python chỉ phục vụ người muốn tạo lại media.

## Windows

1. Giải nén toàn bộ ZIP vào một thư mục có quyền ghi, không chạy trực tiếp trong ZIP.
2. Nháy đúp `start.cmd`. Lần đầu đợi cài thư viện; giữ cửa sổ mở.
3. Mở http://127.0.0.1:3001/admin nếu trình duyệt chưa tự mở.
4. Dừng bằng Ctrl+C. OBS kết thúc phát sóng riêng.

## macOS

Có launcher cho Intel và Apple Silicon; chưa được nghiệm thu trên Mac thật.

1. Cài Node.js 24 dành cho đúng CPU, giải nén gói vào Documents hoặc thư mục có quyền ghi.
2. Mở Terminal tại thư mục vừa giải nén và chạy:

```bash
bash start.command
```

3. Mở http://127.0.0.1:3001/admin . Giữ Terminal mở, Ctrl+C để dừng.

Cách chạy chung Windows/Mac từ thư mục dự án:

```text
npm ci
npm start
```

## Thử trước, chưa cần LIVE

1. Tại admin mở trang **Màn hình phát**, bấm **Bật tiếng** ở màn phát nếu cần.
2. Trong **Thiết lập & chạy thử**, thử combo, các mức xu, bình luận và tim.
3. Thử top 40 khi chưa kết nối TikTok. Nhãn mô phỏng giúp phân biệt dữ liệu mẫu. Mô phỏng không cộng vào thống kê thật.
4. Bộ 99 quẻ có tiếng đọc local; thư viện có ba bản nhạc không lời. Chọn bài và chỉnh âm lượng theo %.

## Đưa vào OBS

1. Đặt canvas dọc 1080 × 1920, 30 FPS.
2. Thêm Browser Source, URL http://127.0.0.1:3001/overlay , Width 1080, Height 1920.
3. Đóng cửa sổ overlay thử trước khi dùng OBS, để OBS trở thành màn phát chính. Preview trong admin luôn im lặng.
4. Bật Control audio via OBS nếu tùy chọn có trên máy. Ghi thử một đoạn để kiểm tra hình/tiếng, tránh thu tiếng Browser và Desktop Audio hai lần.
5. Khi kênh đã LIVE, nhập @username của mình trong admin và bấm Kết nối. Dùng tài khoản xem khác xác nhận tim, bình luận và quà thật.

Tool không tự bắt đầu phát, không cấp quyền LIVE, không cung cấp stream key. Đường phát TikTok/OBS phụ thuộc quyền của tài khoản. Connector không chính thức có thể bị TikTok thay đổi hoặc ngắt; không cam kết hoạt động với mọi tài khoản.

## Dữ liệu và âm thanh

- Lần đầu trống tên kênh, trống thống kê. Dữ liệu tạo riêng trong `data/` trên máy người dùng.
- Sao lưu `data/` trước khi nâng cấp; giữ dữ liệu đó riêng, không đăng vào repo công khai.
- Thêm nhạc có quyền sử dụng vào `public/assets/music/`, bấm **Cập nhật danh sách nhạc**.
- Nếu cổng 3001 đang bận, đóng instance cũ rồi chạy lại. Chỉ chạy một bản mỗi lúc.
- Nếu không có tiếng: kiểm tra Bật tiếng, âm lượng admin, trạng thái màn phát chính và bộ trộn OBS. Thiết lập đường âm thanh của macOS có thể khác Windows.

## Dành cho người xem mã nguồn

Node.js + Express cung cấp API/trang web, WebSocket cập nhật cảnh và hàng đợi, `tiktok-live-connector` nhận sự kiện, HTML/CSS/JavaScript/Canvas vẽ cảnh. Audio được phát bằng trình duyệt. Không cần build frontend.

```text
npm test
```

Các bài test HTTP/WebSocket chạy trên cổng tạm, không cần tài khoản TikTok thật. Việc test local đạt không xác nhận quyền LIVE hoặc khả năng kết nối trên mọi máy.
