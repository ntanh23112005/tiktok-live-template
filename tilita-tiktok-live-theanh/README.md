# Tilita TikTok Live TheAnh

Tool local Windows: nhận tương tác TikTok → luật quà/comment → hàng đợi → cảnh Chùa dọc trong OBS. Không cần hosting, Bun, Python, Electron hoặc database.

Cảnh mặc định hiện là **chùa gỗ / Phật tử áo nâu** do ImageGen tạo mới. Nền và bộ 8 tư thế được đóng gói trong `public/assets/wooden-temple-v1`; không phụ thuộc thư mục ảnh mẫu trong `output`. Nhân vật chính và người ngồi hai bên dùng cùng bộ áo nâu. Các tư thế giữ tỉ lệ cơ thể và vị trí chân, không phóng lớn tư thế nằm lạy thành chiều cao đứng. Tiếng chuông/mõ, nhạc tự chọn và luật tương tác không thay đổi khi thay cảnh.

Sau khi cập nhật bộ cảnh: F5 trang quản lý/preview; với OBS bấm **Refresh cache of current page** một lần trong Properties của Browser Source (làm giữa các lượt). Không cần đổi URL hoặc cấu hình lại kênh.

## Chạy lần đầu

1. Cài Node.js **24 trở lên** nếu máy chưa có. Máy dùng khi phát triển đã có Node 24.
2. Mở `start.cmd`. Lần đầu tool chạy `npm ci` nếu thiếu dependency, nên cần Internet. Giữ cửa sổ chạy tool mở trong buổi LIVE.
3. Trang quản lý tự mở ở [http://127.0.0.1:3001/admin](http://127.0.0.1:3001/admin). Shortcut dùng đúng dữ liệu phiên đang lưu tại `output/qa-v2/data`.
4. Đóng bằng Ctrl+C trong cửa sổ chạy tool; OBS kết thúc phát sóng riêng.

Chạy nhanh trong PowerShell, từ thư mục dự án:

```powershell
.\start.cmd
```

`start.cmd` tự đặt cổng 3001 và đường dẫn dữ liệu, chỉ cài dependency khi còn thiếu. Nếu báo cổng bận, dừng bản tool cũ bằng Ctrl+C rồi chạy lại. Chỉ mở một instance. Tool chỉ nghe loopback, không mở cho máy khác trên mạng.

## Thử mà chưa cần LIVE

1. Mở **Màn hình phát** từ trang Vận hành, để cửa sổ này mở. Preview trong trang quản lý chỉ xem, không tự lấy lượt.
2. Bấm **Bật tiếng** trên màn hình phát.
3. Sang **Thiết lập & chạy thử** → **Combo x5**. Đúng là một người diễn một lần, nhãn Rose ×5; thống kê quà thật vẫn bằng 0.
4. Bấm **4 người cùng gửi** để xem quà vượt các comment còn chờ. Người đang diễn không bị cắt.
5. Thử tạm dừng, tiếp tục và bỏ qua. Tạm dừng chỉ ngừng lấy lượt kế tiếp; **Dừng nhận lượt** mới chặn thêm lượt. Quà thật vẫn được thống kê khi dừng nhận lượt.

Khi dùng OBS thật, đóng cửa sổ /overlay thử trước rồi mới thêm nguồn OBS. Màn hình /overlay mở đầu tiên là màn hình phát chính. Màn hình thứ hai chỉ theo dõi, không phát tiếng/điều khiển lượt. Preview luôn tắt tiếng.

## Luật mặc định

| Tương tác | Hành động | Ưu tiên |
|---|---|---:|
| thắp hương, dâng hương | Lễ Phật | 0 |
| cầu an, cầu bình an | Thả đèn | 0 |
| xin xăm, gieo quẻ | Lời nhắc bình an | 0 |
| Rose, Hoa hồng | Dâng hoa | 10 |
| Quà khác | Theo giá trị quà có trong metadata | 10; từ 100 xu là 20 |

Sửa tại **Luật tương tác**, có nút Lên/Xuống để chọn thứ tự xét. Comment khớp cụm từ, hỗ trợ không dấu/không phân biệt hoa thường. Một comment chỉ tạo một lượt. Quà xét ID trước (`id:5655`), rồi tên, rồi `*`. ID cần lấy từ sự kiện thực/danh mục của kênh; tên Rose mặc định dùng làm dự phòng. Luật mới không sửa các lượt đã vào hàng chờ.

Combo phải có sự kiện kết thúc mới tạo lượt. Một combo x10 vẫn một lượt x10. Không cộng 1+2+3 khi nhận các cập nhật của cùng combo. Thiếu mã sự kiện/nhóm sẽ bỏ qua và báo trong nhật ký; combo chưa có kết thúc sau 2 phút cũng được ghi nhận lỗi thay vì đoán thành quà mới.

Mặc định chống spam comment 30 giây/người, một comment chờ/người, tối đa 200 lượt chờ. Cùng ưu tiên thì đến trước chạy trước. Sau 5 lượt ưu tiên, cho một lượt thường đang chờ chạy. Hàng chờ đầy từ chối lượt mới và báo lỗi; quà thật vẫn được thống kê. Like/follow/share mặc định tắt, khi bật chỉ tạo hiệu ứng ngắn, tối đa một hiệu ứng mỗi loại/5 giây.

## Đưa vào OBS

### Đạo tràng top 16 và các kịch bản

16 chỗ ngồi phía dưới nay là người tặng quà có tổng xu cao nhất trong **phiên LIVE đang kết nối**, có tên/avatar, hạng và số xu. Hạng 1–2 ngồi gần trục giữa ở hàng trên cùng; hạng 3–4 hai bên, rồi đến các hàng dưới. Ba hạng đầu có viền vàng. Chưa có đóng góp thì chỉ hiện chỗ trống, không dùng người giả làm người tặng thật.

Xếp theo tổng giá trị quà đã chốt combo, không tính comment/like. Cùng số xu: người đạt mức đó trước xếp trước. Dữ liệu phiên được lưu cùng thống kê; kết nối lại cùng room ID giữ top, room ID mới bắt đầu bảng mới. Thống kê tích lũy trên máy vẫn được giữ. Quà thiếu giá trị không tự quy thành xu để chiếm ghế.

Các kịch bản có chuyển động và nhịp riêng:

| Kịch bản | Diễn biến |
|---|---|
| Dâng hương | Bước lên, thắp ba nén hương, đảnh lễ tam bái |
| Cầu bình an | Quỳ tại lối đi, gửi lời cầu an lên hoa đăng bay lên |
| Xin xăm | Quỳ, gieo ống xăm, mở lời nhắc bình an |
| Dâng hoa sen | Dâng hoa, các cánh sen mở rồi nâng lên |
| Dâng đèn | Bước lên, tám ngọn đèn sáng dần hai bên lối đi |
| Dâng lễ | Dâng mâm ngũ quả lên bàn thờ, lễ tạ |
| Đại lễ | Thỉnh chuông, sáng đạo tràng, hàng ghế top cùng lạy theo hàng, mưa hoa |

Trong **Thiết lập & chạy thử**, chọn **Kịch bản xem thử → Chạy kịch bản** để thử trực tiếp từng cảnh, không cần đổi luật quà. Nút **Thử top 16** hiển thị dữ liệu mẫu có nhãn **TOP MÔ PHỎNG**; **Thoát top mẫu** quay về dữ liệu thật. Không bật top mẫu khi đang kết nối LIVE; kết nối thành công hoặc nhận quà thật sẽ trả về top thật. Mô phỏng không cộng vào thống kê quà thật.

Khi cập nhật bản có thay backend, mở lại tool và refresh nguồn OBS một lần; không cần sửa luật hoặc cấu hình kênh.

1. Trong OBS → Settings → Video: đặt khung dọc **1080 × 1920**, FPS **30**.
2. Thêm nguồn **Browser**. URL: [http://127.0.0.1:3001/overlay](http://127.0.0.1:3001/overlay). Width 1080, Height 1920.
3. Tắt **Shutdown source when not visible** và **Refresh browser when scene becomes active** để tránh mất màn hình giữa lượt.
4. Nếu có **Control audio via OBS**, bật để có kênh tiếng riêng trong bộ trộn. Tránh thu đồng thời âm thanh Browser và Desktop Audio gây vọng.
5. Chuột phải nguồn → **Interact** → bấm **Bật tiếng** nếu nút đang hiện. Thử quà, xem thanh âm lượng OBS và ghi một đoạn ngắn để kiểm tra tiếng.
6. Khi đổi cảnh hoặc tải lại nguồn, lượt đang chạy có thể bị đánh dấu gián đoạn. Tool không tự diễn lại lượt đó, lượt chờ tiếp tục khi có màn hình sẵn sàng.

[Tài liệu Browser Source của OBS](https://obsproject.com/kb/browser-source).

## LIVE TikTok lần đầu

**Tool không bắt đầu buổi phát, cấp quyền LIVE hoặc cấp stream key.** Trước hết mở TikTok kiểm tra mục LIVE và quyền nhận quà của kênh. Quyền phát bằng OBS/ứng dụng máy tính phụ thuộc tài khoản và những lựa chọn TikTok cung cấp cho bạn.

- Nếu kênh có đích phát/stream key cho OBS: nhập theo thông tin TikTok cung cấp trong thiết lập Stream của OBS. Giữ stream key riêng, không đưa vào source hoặc ảnh chụp gửi công khai.
- Nếu chỉ được dùng TikTok LIVE Studio: mở màn hình /overlay trong cửa sổ trình duyệt riêng, thêm **Window Capture** và thu tiếng ứng dụng tương ứng. Không chọn cửa sổ /admin. Giữ cửa sổ phát mở.
- Nếu chưa có quyền LIVE trên máy tính: làm theo thông báo của TikTok; vẫn có thể thử tool offline. Cài tool không thay đổi quyền của kênh.

Khi hình/tiếng sẵn sàng:

1. Bắt đầu LIVE bằng OBS hoặc LIVE Studio theo quyền của kênh.
2. Trong tool nhập đúng **@username** → **Kết nối**. Không nhập link, mật khẩu hoặc cookie. Chờ **Đã kết nối** và mã phòng.
3. Dùng tài khoản xem khác comment “cầu an”. Kiểm tra đúng tên/avatar và một lượt xuất hiện. Khi có quà thật, kiểm tra combo và thống kê theo người gửi.
4. Kết thúc LIVE trong phần mềm phát trước, sau đó ngắt kết nối và đóng tool.

Connector không chính thức có thể gặp lỗi phòng offline, giới hạn mạng hoặc dịch vụ ký kết nối. Tool hiện lỗi và thử lại tối đa mỗi 30 giây; bấm **Ngắt** để dừng. Không tự cài TikFinity, mua dịch vụ hoặc yêu cầu đăng nhập ngoài. Nếu lỗi liên tục, giữ nguyên thông báo trong nhật ký để kiểm tra nguyên nhân.

## Âm thanh và dữ liệu

- Mỗi lượt quà đã chốt combo có bảng tri ân 3 giây trước nghi thức: avatar (hoặc chữ đầu tên nếu thiếu ảnh), tên người gửi, tổng xu của combo và lời cảm ơn ngắn. Bảng đi theo hàng đợi nên các quà đến cùng lúc không ghi đè nhau. Bình luận/tim miễn phí không có bảng này. Đọc xăm, chuông và chuyển động nghi thức bắt đầu sau bảng tri ân; bỏ qua lượt sẽ đóng bảng cùng lượt đó.

- Hiệu ứng chuông/mõ tổng hợp trong trình duyệt. Bộ xăm có **99 lời riêng**, đánh số 1–99, mỗi lời gồm tiêu đề, hai câu thơ và diễn giải ngắn. Giọng đọc tiếng Việt Mai Chi được tạo sẵn trong `public/assets/fortunes`, phát local và khớp ID/nội dung trên thẻ; không gọi TTS khi LIVE.
- Bộ quẻ được nạp khi khởi động server. Sau khi thêm quẻ, mở lại tool vào lúc phù hợp để sử dụng bộ mới; các phiên đang chạy tiếp tục dùng bộ đã nạp. Trong Thiết lập & chạy thử có danh sách nghe thử và kiểm tra số file đọc sẵn sàng.
- Danh sách nhạc nền có 5 bài: **Niệm Phật · Thầy Thích Chúc Thiện**, **Niệm Phật · Phối khí**, **Sen tĩnh**, **Trúc an**, **Mây thiền**. Ba bài cuối là nhạc không lời tạo riêng, mỗi bài 3 phút 12 giây, phát lặp. Chọn bài trong Thiết lập là đổi và lưu ngay; âm lượng giữ nguyên theo % đã chọn. Nguồn phát chính có tiếng, preview im lặng và nhạc giảm khi đọc xăm.
- Muốn thêm bài: đặt file MP3/WAV/M4A/OGG vào `public/assets/music`, rồi bấm **Cập nhật danh sách nhạc** trong admin. Chỉ hiện file thực sự có trên máy. Tên file có thể dùng tiếng Việt, khoảng trắng; không cần đổi thành `music.mp3`. Bài đang dùng ở `public/assets/music.mp3` vẫn được giữ.
- Xem nguồn tại `THIRD-PARTY.md`. Nếu cần nghe trên loa/tai nghe khi dùng Control audio via OBS, bật **Audio Monitoring** của Browser trong Advanced Audio Properties; OBS 33 hiển thị công tắc **Enable**. Tránh thu lại cùng đường tiếng qua Desktop Audio gây tiếng đôi.
- `data/config.json`: cấu hình; `data/stats.json`: thống kê quà thật tích lũy trên máy, không phải doanh thu. Cấu hình và thống kê được ghi qua file tạm.
- Hàng đợi, lịch sử lượt gần đây và nhật ký giữ trong phiên chạy. Đóng tool sẽ bỏ lượt cũ, không tự phát lại khi mở.
- File dữ liệu hỏng: tool dùng mặc định và báo lỗi, không tự ghi đè file gốc. Đóng tool, sao lưu/đổi tên file lỗi rồi mở lại; cần thao tác này trước khi lưu được dữ liệu đó.
- `.gitignore` loại dữ liệu cá nhân, nhạc riêng, dependency và ảnh kiểm thử khỏi source. Xem `THIRD-PARTY.md` trước khi chia sẻ tài nguyên tham khảo.

## Kiểm thử và giới hạn xác nhận

```powershell
npm test
```

Kiểm thử bao gồm luật, combo, chống trùng, ưu tiên, chống spam, mất renderer, thời hạn dự phòng, lưu file và API/WebSocket. Đã kiểm tra trình duyệt local; LIVE thật và âm thanh OBS cần xác nhận trên kênh/máy phát của bạn. Không có dữ liệu quà thật được dựng giả để chứng minh kết nối.
