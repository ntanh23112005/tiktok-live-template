# Hang MU · THEANH

Bản riêng từ cơ chế tương tác của Tilita LIVE. Bản chùa nằm ở thư mục khác và không bị thay đổi.

V1.3: cảnh meme lớn dần theo xu, nhân vật riêng nhìn chính diện, tiếng meme rút gọn và đồng bộ động tác. Xem [chi tiết bản cập nhật](docs/V1.3-MEME-EFFECTS.md).

## Mở trên Windows

**Bấm đúp `start.bat`**. Máy cần Node.js 24 trở lên. Lần đầu, file chạy tự cài thư viện nếu chưa có; các lần sau mở trực tiếp.

Hoặc dán vào PowerShell:

```powershell
cd A:\tiktok-live\tilita-tiktok-live-mu-theanh
npm.cmd start
```

- Admin: http://127.0.0.1:3002/admin
- OBS Browser Source: http://127.0.0.1:3002/overlay — 1080 × 1920, 30 FPS.
- Preview: http://127.0.0.1:3002/preview — luôn im lặng.
- Nhập tài khoản TikTok đang LIVE trong admin rồi kết nối. Tool không tự phát sóng.
- Dừng server bằng Ctrl+C trong cửa sổ đã chạy.

## Tương tác

Đủ 10 tim theo từng người hoặc bình luận “vào hang” để vào ngồi. Quà vẫn tự đưa người tặng vào. Follow/share có dòng cảm ơn, không tự chiếm chỗ. Không giới hạn tổng thành viên; khung hình xếp dày 7 vị trí top và 80 fan, nhóm luân phiên mỗi 10 giây.

- `nam`, `nữ`/`nu`, `ronaldo`/`cr7`, `maguire`/`marguire`: đổi hình.
- `đứng`, `ngồi`, `nằm`, `chửi`, `khóc`, `ăn mừng`: đổi tư thế. Có thể gõ không dấu, riêng `nam` là nhân vật nam; dùng `nam xuong` cho tư thế nằm không dấu.
- `vào hang`/`vao hang`: đi lên vái Chủ nhiệm Carrick rồi trở về chỗ ngồi. Lượt này chống spam tối thiểu 30 giây/người; vẫn nhận thoại và lệnh tư thế trong thời gian đó.
- Người đã vào ngồi bình luận sẽ hiện thoại trên đầu; người mới cần đủ 10 tim hoặc gõ vào hang trước.
- Tối đa 3 thoại cùng lúc, mỗi thoại 4 giây; gộp spam của cùng người. Người có xu trong phiên cao hơn được ưu tiên; sau 5 thoại ưu tiên có một lượt thường nếu đang chờ.
- Top 1–3 là Bá chủ hang; top 4–7 là Phó chủ. `đội trưởng` chỉ áp dụng cho top 7. Fan ngồi quay lưng hướng lên Carrick; nhân vật biểu diễn meme được quay chính diện.

## Mốc quà

Chờ combo kết thúc; giá mỗi quà nhân số lượng quyết định đúng một hiệu ứng.

| Xu/combo | Hiệu ứng |
|---|---|
| 1–2 | Lật thẻ meme MU |
| 3–4 | Đóng cửa hang |
| 5–9 | Compa Antony |
| 10–29 | SIUUU |
| 30–99 | Ole cầm lái |
| 100–499 | Fergie Time |
| 500+ | GGMU — Mở hội |

Một lượt quà: cảm ơn 3 giây → đi lên/vái Carrick → hiệu ứng → về chỗ ngồi. Lượt xếp hàng theo ưu tiên; không ngắt giữa lượt đang chạy. Quà thiếu giá trị không tự đoán xu.

## Âm thanh

File meme/vỗ tay nằm ở `public/assets/sounds/`: đã có đủ 12/12 cue từ goal, clap, siuuuu và ba lời cảm ơn. Xem `docs/AM-THANH-DA-NAP.md` và bấm Nạp lại âm thanh trong admin sau khi thay file. Năm tiếng tổng hợp cũ không còn được gọi. Âm thanh phát cùng động tác; riêng thẻ fan đọc xong mới vỗ tay.

Đã có GGMU có lời từ file chủ dự án cung cấp và 3 bài không lời mới. Chọn bài, bật lặp, nghe thử và chỉnh âm lượng % ở admin. Nhạc mặc định 6%; trong lúc đọc thẻ giảm thêm khoảng 10 dB.

99 thẻ fan có audio Tiến Đạt đã tạo sẵn. LIVE không cần Python hoặc dịch vụ TTS trực tuyến. Chỉ một overlay chính phát tiếng; preview im lặng. Bỏ qua lượt sẽ dừng lời đọc và hiệu ứng âm thanh.

## Dữ liệu và tài nguyên

- Cấu hình và thống kê của bản này nằm ở `data/`; có thể đổi bằng biến `TILITA_MU_DATA_DIR`.
- Hình đang dùng nằm trong `public/assets/mu-cave-v1/`, được tạo bằng ImageGen; prompt lưu ở `docs/imagegen-prompts.json`.
- Nhân vật meme chính diện và quỷ đỏ mới: `public/assets/mu-meme-v1.3/`; prompt tạo hình trong `PROMPTS.md` cùng thư mục, dùng ImageGen tích hợp.
- Audio thẻ: `public/assets/fan-cards/`; thư viện nhạc: `public/assets/music/`.
- API danh mục thẻ: `/api/fan-cards`; các API kết nối/cấu hình/điều khiển giữ như cũ.

V1.3 đã qua 77 kiểm tra logic/API. Chủ live tự xem hình và nghe tiếng trên Chrome/OBS theo yêu cầu. Dừng server cũ, mở lại start.bat/start.cmd và tải lại admin/overlay để dùng cả nhịp diễn mới ở backend.
