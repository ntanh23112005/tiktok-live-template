# Bộ xăm 99 lời

Ngày cập nhật: 02/11/2026.

`config/fortunes.json` chứa 99 mục đánh số 1–99: 24 mục ban đầu và 75 mục bổ sung. Mỗi mục có ID riêng, tiêu đề, hai câu thơ tự soạn và lời diễn giải ngắn để chiêm nghiệm. Đã dừng và dọn nhóm từ số 100 trở lên theo yêu cầu.

## Sử dụng

- Khởi động lại server vào lúc phù hợp để nạp bộ mới. Server đang mở tiếp tục dùng bộ đã nạp; việc chuẩn bị file không ngắt phiên LIVE.
- Trong admin, mở **Thiết lập & chạy thử → Cảnh & âm thanh**, kiểm tra **99/99 lời xăm có audio**. Danh sách nghe thử có đủ số 1–99; tải lại admin nếu trang đang mở từ trước khi server khởi động lại.
- Backend chọn một quẻ cho mỗi lượt. Chữ, file đọc và thời lượng cùng thuộc ID đã chọn. Giữ thẻ thêm 1,5 giây sau đoạn đọc.
- File WAV và `manifest.json` nằm trong `public/assets/fortunes`. Khi LIVE không cần Python hoặc dịch vụ TTS trực tuyến.

## Tạo lại file đọc khi sửa nội dung

Chạy từ thư mục dự án, trên máy có môi trường chuẩn bị tiếng đọc:

```powershell
& '.\output\tts-env\Scripts\python.exe' '.\scripts\prepare-fortunes.py'
```

Script chỉ tạo lại mục chưa có file khớp phiên bản nội dung, giữ cache còn hợp lệ. Có thể dùng `--force-id an-28` để chủ động tạo lại một ID. Mặc định dùng một tiến trình; `--workers 2 --threads 1` cho phép tạo hai file song song khi máy đủ bộ nhớ.

Khi bổ sung dữ liệu mới bằng `--additions path.json`, catalog chỉ được thay sau khi toàn bộ file đọc hợp lệ. Script không sửa mục cũ trùng ID, không chấp nhận ID/số bị trùng, và sao lưu catalog trước khi mở rộng. WAV, manifest và catalog được ghi qua file tạm.

## Kiểm tra tự động

```powershell
npm.cmd test
& '.\output\tts-env\Scripts\python.exe' '.\scripts\audit-fortunes.py'
```

Kiểm tra gồm số/ID/nội dung riêng, đủ audio đúng phiên bản, thời lượng, dạng sóng và nhận dạng tiếng Việt local. Đủ 99/99 file, không trùng số hoặc nội dung; file đọc dài 7,411–13,221 giây và không có mẫu âm thanh bị clipping. Nhận dạng tự động giúp tìm lỗi đọc thiếu; vẫn có thể nghe thử từng mục trong admin để đánh giá chất giọng trên thiết bị phát.

Bản sao trước đợt mở rộng nằm tại `output/fortune-expansion/before-124-20261102-221625`. Hai báo cáo cuối là `catalog-check-99.json` và `narration-audit-99.json` trong `output/fortune-expansion`; phần thử từ số 100 trở lên đã được chuyển vào `unused-100-plus`, ngoài thư mục phát.
