# Plan hoàn thiện màn LIVE — chùa gỗ / áo nâu

Ngày lập: 02/11/2026, giờ Việt Nam. Trạng thái: kế hoạch, chưa triển khai thay đổi màn phát.

## Quyết định và phạm vi

- Áp dụng cho bản mới nhất: `A:\tiktok-live\tilita-tiktok-live-theanh`. Người dùng đã xác nhận luôn dùng bản mới nhất.
- Tăng từ **16 lên 40 chỗ**, thêm đúng 24 chỗ: 20 bên trái, 20 bên phải.
- Dời hướng dẫn comment, luật quà → nghi thức ra vùng giữa hai bên; có thể thu/mở từ trang quản lý.
- Chừa vùng bình luận dưới trái và vùng nút TikTok bên phải; giữ trục tượng Phật, bàn thờ và đường hành lễ giữa.
- Có giọng đọc xăm/quẻ tiếng Việt trước phiên live, ưu tiên miễn phí, chậm vừa và ấm; tạo file sẵn để phát ổn định.
- “Role donate” trong plan được hiểu là bảng luật/quyền lợi khi tặng quà. Bản hiện tại chưa có hệ thống danh hiệu với ngưỡng riêng. Nếu thêm danh hiệu sau này, dùng chung bảng hướng dẫn; không tự bịa ngưỡng từ ảnh tham khảo.
- Ba ảnh là tài liệu tham khảo thị giác. Không sao chép mức xu, luật tương tác, lời quẻ hoặc danh hiệu trong ảnh thành yêu cầu nghiệp vụ.

## Những gì đã kiểm tra trong bản hiện tại

| Vị trí | Hiện trạng | Tác động khi làm |
| --- | --- | --- |
| `public/js/hall.js` | 16 ghế, 4 hàng sâu × 2 ghế mỗi bên; vị trí và nhịp đồng lễ dựa vào nhóm 4 | Phải đổi cả tọa độ, thứ tự hạng và nhóm animation |
| `src/core.js` | Snapshot bảng phiên bị cắt ở 16; demo tạo 18 người rồi cũng bị cắt ở 16 | Chỉ thêm ghế phía giao diện sẽ khiến ghế 17–40 không có dữ liệu |
| `public/js/overlay.js` | Footer lấy ba luật đầu đang bật | Với cấu hình mặc định, cả ba là comment; hướng dẫn quà không xuất hiện |
| `public/overlay.css` | Hướng dẫn/lượt tiếp theo nằm sát đáy; bảng top ở trên trái | Cần chuyển vùng nội dung quan trọng ra khỏi phần bình luận |
| `config/default.json`, `src/core.js` | Có luật quà theo tên/ID và fallback theo giá trị | Bảng quà phải phản ánh luật đang bật và thứ tự xét thật |
| `server.js` | Đã đồng bộ state qua WebSocket; preview không điều khiển lượt | Có thể bổ sung trạng thái bảng phụ vào luồng này |
| `public/js/admin.js`, `public/admin.html` | Nút, nhãn và mô tả top 16 | Đổi đồng bộ thành top 40 và thêm điều khiển bảng phụ |
| `public/js/overlay.js`, `public/js/rituals.js` | Chưa có TTS; xin xăm dùng 3 lời nhắc ở frontend, lượt cố định 10,5 giây | Cần bộ nội dung có ID, audio đi cùng và thời lượng riêng cho đoạn đọc |
| Máy Windows đang dùng | Các token giọng hệ thống kiểm tra được chỉ có tiếng Anh; lệnh Python trỏ về App Installer | Chưa thể dựa vào giọng Việt cài sẵn hoặc coi worker Python là đã chạy được |

## Bố cục đề xuất

**Chọn hướng hai bên:** bảng “Cách tham gia” bên trái vùng giữa, bảng “Tấm lòng thành” bên phải vùng giữa. Hai bảng thu gọn thành nhãn ngắn; tối đa một bảng mở rộng tại một thời điểm. Đặt bảng phía ngoài trục nghi thức, phía trên vùng ghế.

Phương án dự phòng: một ngăn bên phải có tab Hướng dẫn / Quà / Top. Hình gọn hơn nhưng khi đang xem hướng dẫn thì top không còn hiện; chỉ chọn nếu thử trên điện thoại cho thấy phương án hai bên quá chật.

### Vùng trên khung 1080 × 1920

Các tọa độ dưới đây là điểm xuất phát để dựng thử, **không phải safe area được TikTok bảo đảm**. Chốt lại bằng màn hình xem LIVE thật.

| Vùng | Khoảng đề xuất | Quy tắc |
| --- | --- | --- |
| Tên cảnh/trạng thái | Dải mỏng trên cùng, chỉnh theo phần giao diện kênh | Không đặt thông tin thiết yếu sát mép trên |
| Tượng Phật | Giữa, nửa trên | Không để bảng top, popup hoặc thông báo che mặt tượng |
| Hướng dẫn bên trái | x≈48–328, y≈650–1050 | Nền nâu đậm đủ che chi tiết phía sau, viền vàng mảnh |
| Top bên phải | x≈644–924, y≈650–1050 | Lùi vào khỏi dải nút bên phải; tối đa top 5 khi mở |
| Lối đi giữa | Xấp xỉ x≈420–650, y≈1000–1620 | Kiểm tra cả bề rộng nhân vật, tư thế lạy và bảng tên; điều chỉnh nếu cần |
| Ghế hai bên | 5 hàng sâu, chân ghế thử tại y≈1120/1230/1340/1450/1560 | Thử xếp so le theo phối cảnh, không để hàng sau phủ đầu/bảng hạng hàng trước |
| Bình luận dưới trái | Dự phòng khoảng x=0–650, y≈1600–1920 | Không có bảng quà/top/lượt tiếp theo hay thông tin bắt buộc đọc |
| Nút TikTok bên phải | Dự phòng dải ngoài cùng khoảng 150 px | Không đặt tên, giá trị quà hoặc nút mở bảng ở đây |

Giữ phong cách chùa gỗ đang dùng: nâu trầm, chữ kem, vàng nhấn nhẹ. Không nhân số lượng khung viền trang trí theo ảnh. Chữ chính trong bảng phụ bắt đầu thử ở 32–36 px trên nguồn 1080, tương ứng khoảng 11–13 px khi thu về ngang 375; nếu khó đọc thì giảm nội dung và ngắt dòng.

### 40 chỗ và thứ tự hạng

- Phương án dựng thử: **5 hàng × 4 chỗ × 2 bên = 40**. So với lưới cũ, mỗi bên từ 8 lên 20, thêm 12 chỗ mỗi bên.
- Thêm đúng một hàng ngang mỗi bên theo lưới cũ chỉ tăng 4 chỗ; thêm một cột dọc mỗi bên tăng 8. Vì mục tiêu đã chốt là +24, cần bố trí lại lưới, không chỉ nối thêm một hàng.
- Top 1–2 ở hai vị trí sát trục giữa, gần bàn thờ; top 3–4 kế bên; tiếp tục theo hàng từ trong ra ngoài, hai phía cân nhau.
- Dùng danh sách ghế có `row`, `side`, `column`, `rank`, `x`, `y`, `scale` rõ ràng; không suy hàng bằng chỉ số chia 4 sau khi đã đổi lưới.
- Giữ đúng người theo user ID. Cùng người gửi thêm quà cập nhật tổng; hạng đổi thì chuyển ghế theo thứ tự mới. Không đổi ghế người đang đồng lễ giữa chừng; áp dụng cập nhật vị trí sau đoạn đồng lễ.
- Trên ghế ưu tiên hạng, avatar nhỏ, tên rút gọn nếu còn đủ khoảng trống. Tên đầy đủ và xu đọc ở bảng top/trang quản lý và khi người đó hành lễ. Không cố nhét 40 thẻ tên/xu cỡ lớn gây đè nhau.
- Ghế chưa có đóng góp vẫn là đệm trống. Mẫu 40 người phải có nhãn MÔ PHỎNG, không làm tăng thống kê thật.
- Giữ cách tính top theo tổng xu của phiên đang kết nối; reconnect cùng room giữ top, room mới bắt đầu top mới như hiện tại.

### Hướng dẫn, quà và top

**Bên trái:** nhãn “Cách tham gia”; khi mở có hai tab “Bình luận” và “Quà tặng”.

- Bình luận: tối đa 3 nhóm dễ hiểu — “thắp hương”, “cầu an”, “xin xăm” → nghi thức tương ứng, chỉ hiện luật đang bật.
- Quà tặng: mỗi dòng gồm tên/nhóm quà, điều kiện áp dụng, nghi thức sẽ chạy. Làm rõ đó là hiệu ứng trong phiên live.
- Tên quà/ID cụ thể được xét trước fallback. Không hiển thị một bảng mức xu chung như thể áp dụng cho mọi quà nếu đang có luật ghi đè.
- Với luật mặc định, **Rose/Hoa hồng luôn theo luật Dâng hoa sen**, kể cả combo đạt ngưỡng lớn. Chỉ nhóm “quà khác” dùng `auto`: tổng 1–4 xu → sen; 5–19 → đèn; 20–99 → mâm lễ; từ 100 → đại lễ. Đây là tổng của lượt/combo, không phải tổng tích lũy để xếp ghế.
- Không ghi giá xu cố định của một quà nếu chưa có metadata/danh mục xác nhận. Trường hợp quà chưa biết giá cần nêu trong QA để tránh bảng diễn giải quá chắc chắn.
- Phần tính ngưỡng `auto` và phần tạo nội dung giải thích nên dùng cùng một nguồn dữ liệu, tránh bảng nói một đằng, nghi thức chạy một nẻo.
- Khi luật dài, chia trang ngắn do người vận hành chọn; không chạy chữ hoặc cuộn tự động khiến khó đọc.

**Bên phải:** “Tấm lòng thành”; mặc định top 3 gọn, mở ra top 5 với tên và tổng xu phiên. Không thêm danh hiệu/ngưỡng mới trong đợt hoàn thiện này.

### Đóng/mở trong lúc phát

- Người vận hành điều khiển từ trang `/admin`: Mở hướng dẫn, tab Bình luận/Quà, Mở top, Thu gọn tất cả. Có trạng thái đang hiện để biết OBS nhận đúng.
- Người xem TikTok đang xem video, không trực tiếp bấm được nút trong overlay. Các nút trong bản xem bố cục chỉ để thử phương án.
- Mở bảng trái thu gọn bảng phải và ngược lại. Mặc định khi lên live là hai nhãn gọn, top 3 gọn; không mở cả hai bảng dài.
- Trạng thái mong muốn của người vận hành và trạng thái thực tế khi có nghi thức được tách rõ. Khi xin xăm/đại lễ cần vùng đọc, tạm thu bảng, kết thúc mới trở lại lựa chọn trước đó. Một thao tác Thu gọn trong thời gian đó phải được tôn trọng, không tự mở lại lựa chọn cũ.
- Chuyển bảng trong khoảng 180–220 ms bằng transform/opacity; không thay đổi kích thước khung sân khấu hoặc làm ghế nhảy vị trí.
- Đồng bộ trạng thái qua backend/WebSocket đến OBS và preview. Không dùng riêng localStorage của trang admin vì OBS là một trình duyệt khác.
- Lưu thiết lập vị trí/chế độ mặc định; trạng thái tạm thời trong phiên được gửi lại khi OBS reconnect. Khởi động lại tool về chế độ thu gọn đã chọn, không phát lại hiệu ứng.
- Không tự luân phiên bảng trong phạm vi bắt buộc trước live. Có thể bổ sung chế độ giới thiệu ngắn sau khi vận hành ổn định.

### Popup và lớp nội dung

- Xin xăm: thẻ vừa vùng trung tâm, chữ có thứ bậc, không kéo dài xuống bình luận. Tên người nhận và lời nhắc đọc rõ. Giữ nội dung lời nhắc hiện tại; không sao chép quẻ từ ảnh.
- Đại lễ: tên người tặng/hiệu ứng nổi bật ngắn; không phủ kín toàn cảnh xuyên suốt lượt.
- Thông báo quà dời khỏi đáy, ưu tiên một dải gọn phía trên vùng ghế; kiểm tra trùng bảng tên người đang diễn.
- Lớp vẽ từ thấp lên cao: nền → ghế theo hàng → nhân vật/đạo cụ → bảng phụ → thông báo → thẻ xin xăm/đại lễ. Hạt sáng không che chữ; lớp trang trí không bắt click.
- Footer hiện tại thu về thông tin ngắn ở vùng an toàn; chuyển danh sách lượt chờ đầy đủ sang admin.

## Giọng đọc xăm/quẻ tiếng Việt — bắt buộc trước live

### Cách chọn giọng miễn phí

**Ưu tiên thử ZeroTTS chạy local để tạo sẵn file**, bắt đầu bằng giọng `maichi`. Dự án cung cấp mô hình tiếng Việt chạy CPU, xuất WAV, giấy phép MIT. Chất “trầm ấm” phải nghe thử trên nội dung thật, chưa coi thông tin mô hình là bằng chứng đã đạt giọng mong muốn. [Nguồn ZeroTTS](https://huggingface.co/zeroweight-ai/ZeroTTS)

Repo RPC cũ có `tts_worker.py` dùng ZeroTTS/Mai Chi, cache và xử lý đầu/cuối sóng âm. Chỉ tham khảo phần hữu ích, port sang quy trình chuẩn bị audio của bản chùa gỗ; không đổi sang dùng bản RPC. Worker đó có đường dẫn model của máy khác và đang giới hạn câu ở 160 ký tự, nên không thể chép nguyên rồi coi là chạy tốt cho quẻ dài.

| Lựa chọn | Dùng vào việc gì | Giới hạn cần giải quyết |
| --- | --- | --- |
| **ZeroTTS local** | Ứng viên chính: tạo sẵn các bài đọc, không tính phí theo ký tự | Cần môi trường tạo audio/model; nghe thử phát âm và tốc độ trên máy này |
| **Edge TTS** | Ứng viên nghe so sánh; xuất MP3 sẵn nếu giọng hợp hơn | Thư viện cộng đồng dùng dịch vụ online của Edge, có thể thay đổi endpoint; không phụ thuộc gọi trực tiếp khi live |
| **Giọng Windows An** | Dự phòng để thử sau khi cài giọng Việt | Microsoft liệt kê An là giọng nam tiếng Việt; hiện máy chưa có token giọng này. Khả năng gọi từ OBS/SAPI cần kiểm chứng riêng |
| **Google Cloud TTS** | Chỉ cân nhắc nếu sau này chấp nhận tài khoản thanh toán | Có hạn mức miễn phí nhưng cần bật billing và có thể tính phí khi vượt; không chọn mặc định cho yêu cầu free |

Edge TTS hỗ trợ xuất file và chỉnh tốc độ/cao độ; khả năng dùng không cần API key được nêu trong dự án. Danh sách giọng thực phải lấy khi chạy thử, không giả định giọng Azure nào cũng có trên Edge. [Nguồn Edge TTS](https://github.com/rany2/edge-tts)

Giọng An được liệt kê trong tài liệu Windows; Google yêu cầu billing trong tài liệu giá. [Giọng Windows](https://support.microsoft.com/en-us/accessibility/windows/narrator/appendix-a-supported-languages-and-voices), [Google Cloud TTS](https://cloud.google.com/text-to-speech/pricing)

Làm 2–3 đoạn nghe so sánh dài 15–25 giây bằng cùng một nội dung, ưu tiên rõ dấu tiếng Việt, ngắt câu tự nhiên, nghe lâu không mệt. Bắt đầu khoảng 0,9–1,0 tốc độ thường; điều chỉnh nhẹ sau khi nghe, không hạ pitch mạnh làm giọng méo. Chốt một giọng thống nhất cho bộ quẻ đầu tiên. Không cần API trả phí hoặc đăng ký billing cho phương án chính.

### Nội dung và cách phát

1. Bắt đầu với **24 lời xăm/lời nhắc tự soạn**: số, tiêu đề, 2–4 câu ngắn và phần diễn giải ngắn; mang tính chiêm nghiệm như nội dung hiện có. Không lấy nguyên văn ảnh tham khảo. Có thể mở rộng bộ sau khi live ổn định.
2. Mỗi mục có ID, văn bản hiển thị, văn bản đọc và phiên bản nội dung. Chọn ID ở backend khi tạo lượt và giữ nguyên trong job; frontend và audio dùng cùng ID, tránh chữ một quẻ và giọng một quẻ khác.
3. Tạo sẵn toàn bộ audio trước live, nghe kiểm tra từng file, ghi manifest `{id, textVersion, voice, file, duration}`. Chưa cần model/Python chạy trong lúc phát nếu chỉ dùng các file đã chuẩn bị.
4. Đọc phần số/tên quẻ rồi lời nhắc và diễn giải, tổng đoạn chính mục tiêu khoảng 12–22 giây. Tên TikTok hiển thị trên thẻ; đọc tên là tùy chọn sau, tránh thêm TTS online cho từng nickname trong phạm vi bắt buộc.
5. Khi xin xăm: hiệu ứng gieo → mở thẻ → audio bắt đầu → giữ thẻ đến đọc hết và thêm khoảng 1,2–2 giây. Kết thúc lượt sau đuôi đọc. Không giữ cứng 10,5 giây làm mất chữ/cắt tiếng.
6. Tách nhịp theo từng pha; giữ đoạn gieo khoảng hiện tại, tăng thời gian pha đọc theo metadata file. Không chỉ kéo giãn toàn bộ `sampleRitual` khiến thao tác gieo cũng chậm theo giọng đọc.
7. Đưa `duration` đã tính vào job phía server và thời hạn dự phòng. Renderer chính phát audio một lần theo job ID; preview/màn phụ luôn im lặng. Tải lại hoặc chuyển renderer không phát lại nguyên câu từ đầu một cách tự động.
8. Audio phát bằng file qua cùng Browser Source với nhạc/chuông. Hạ nhạc nền khoảng 8–12 dB khi có lời đọc rồi trả về mức người vận hành đã chọn; chỉnh riêng âm lượng giọng. Đây là mức khởi điểm để nghe thử, không phải kết quả cân âm đã xác nhận.
9. Bỏ qua lượt phải dừng đúng file, xóa lịch phát của lượt cũ và trả nhạc về đúng mức. Tạm dừng nhận lượt kế tiếp không cắt bài đang đọc. Có nút “Tắt lời đọc” riêng.
10. Thiếu file/phát lỗi: báo admin, dùng thời gian đọc chữ dự phòng có giới hạn rồi tiếp tục hàng đợi; không chờ vô hạn, không lặp TTS liên tục. Khi bật chế độ đọc trước live, preflight phải báo mục nào còn thiếu audio.

### Điều khiển cần có trong admin

- Bật/tắt lời đọc; âm lượng giọng; chọn bộ giọng đã tạo sẵn.
- Nghe thử một quẻ, hiển thị thời lượng và trạng thái bộ file đã sẵn sàng.
- Cho chọn nơi nghe thử: trang admin phát một file thử có chủ ý; chế độ live chỉ renderer chính phát. Không tự đọc đồng thời ở admin và OBS.
- Giữ nút Bật tiếng trong nguồn OBS và trạng thái audio hiện có; thêm tình trạng file đọc, không coi audioReady là bằng chứng OBS đã thu được tiếng.

## Thứ tự triển khai trước phiên live

### P0.1 — Chốt bố cục bằng dữ liệu mẫu

1. Dựng thử lưới 40 trên **nền chùa gỗ thật**, gồm ghế trống và đầy.
2. Đặt bảng trái/phải, vùng bình luận/nút bên phải giả lập; thử cả thu và mở.
3. Xem tại 1080×1920, 540×960, 375×667 và chiều rộng 360.
4. Chạy tư thế quỳ/lạy/đồng lễ trên đủ 40 để chốt khoảng cách. Nếu 4 cột không đủ chỗ cho tên, giảm nhãn trên ghế; không giảm chữ hướng dẫn đến mức khó đọc.

Hoàn tất khi: 40 chỗ không cắt mép, tư thế lạy không đè lối đi, bảng quà/top đọc được khi thu về điện thoại. Nếu mép phải còn bị giao diện TikTok che, dịch cả vùng ghế phải vào trong và kiểm lại lối đi.

### P0.2 — Mở rộng top 40 xuyên suốt

1. Tách hằng số sức chứa 40 và cấu hình lưới dùng chung.
2. Đổi giới hạn snapshot và demo top 40 trong `src/core.js`; demo tạo đủ 40 ID khác nhau và giá trị hợp lệ.
3. Đổi `public/js/hall.js`, nhịp đồng lễ theo `row` và sắp hạng theo danh sách tọa độ.
4. Đổi aria-label, nhãn admin, hướng dẫn, README; xử lý avatar lỗi và tên dài.
5. Không đổi bộ lọc quà, chống trùng combo hoặc dữ liệu thống kê đang lưu khi chỉ tăng sức chứa.

Hoàn tất khi: gửi mẫu hơn 40 người lấy đúng top 40; người hạng 41 tăng đóng góp vào được top; không có người trùng ghế; reload/reconnect giữ đúng phiên.

### P0.3 — Bảng luật/quà và điều khiển từ admin

1. Bổ sung vùng bảng phụ trong `public/overlay.html`, dời footer bằng `public/overlay.css`.
2. Tách module hiển thị bảng, ví dụ `public/js/live-panels.js`; `overlay.js` chỉ nối trạng thái và nghi thức.
3. Tạo dữ liệu giải thích từ luật đã lưu và đang bật; thể hiện rõ luật quà cụ thể so với fallback `auto`.
4. Bổ sung validation cho thiết lập bảng, trạng thái runtime và API điều khiển có lệnh cho phép rõ ràng trong `src/core.js`/`server.js`.
5. Bổ sung điều khiển ở `public/admin.html`, `public/js/admin.js`, `public/admin.css`; gửi state cho OBS và preview.
6. Thêm ưu tiên thu bảng khi hiện thẻ xin xăm/đại lễ, đồng thời giữ đúng lựa chọn mới nhất của người vận hành.

Hoàn tất khi: một lần bấm ở admin đổi được OBS; lưu luật quà làm bảng hướng dẫn cập nhật; thu/mở không reset lượt đang diễn, âm thanh hay thứ hạng.

### P0.4 — Hoàn thiện đọc xăm/quẻ

1. Tạo môi trường chuẩn bị audio tách khỏi runtime Node của tool; dựng đoạn nghe so sánh ZeroTTS và một lựa chọn miễn phí khác nếu khả dụng.
2. Chốt giọng bằng nghe thử; biên soạn 24 mục, sinh file, kiểm tra dấu/ngắt câu/âm lượng và manifest thời lượng.
3. Tách dữ liệu quẻ khỏi `overlay.js`, bổ sung module phát lời đọc; tích hợp lựa chọn quẻ/job duration phía `src/core.js` và pha đọc trong `public/js/rituals.js`.
4. Cập nhật `server.js`, `config/default.json`, validation cấu hình và điều khiển admin; công cụ chuẩn bị audio có thể đặt trong `scripts/`, metadata trong `config/`, file phát trong `public/assets/fortunes/`.
5. Dùng lại cache/chuẩn hóa âm từ worker cũ khi phù hợp; không mang giới hạn 160 ký tự sang đoạn quẻ và làm mất phần kết. Tách theo câu rồi ghép trước live nếu engine cần giới hạn đầu vào.

Hoàn tất khi: đủ audio cho bộ quẻ, chữ/tiếng khớp ID, nghe được trong bản ghi OBS, giữ thẻ đủ lâu, skip dừng tiếng, preview im lặng, bộ quẻ vẫn đọc được khi ngắt mạng sau khi đã tải file.

### P0.5 — Chạy tổng duyệt và chốt bản dùng live

- Chạy `npm test`; cập nhật kiểm thử top 16 thành top 40 bằng các tình huống nghiệp vụ, không chỉ đổi con số trong assertion.
- Kiểm thử các mốc: 0/16/40/45 người; top 40/41 đổi chỗ; cùng xu; một người gửi nhiều lần; combo và sự kiện lặp; room cũ/mới; mô phỏng và dữ liệu thật.
- Kiểm thử luật giải thích: luật quà tên/ID, override Rose, các biên 4/5/19/20/99/100, luật tắt, chỉnh thứ tự, đổi cấu hình khi đang có lượt chờ. Bảng giải thích luật hiện tại; lượt cũ tiếp tục theo luật lúc đã vào hàng đợi.
- Kiểm thử bảng phụ: mở/thu qua admin, preview cùng state, reconnect OBS; xin xăm/đại lễ tạm thu; thao tác thu trong lúc nghi thức; không có hai bảng mở rộng.
- Kiểm thử lời đọc: đủ file/thiếu file, sai phiên bản text/audio, autoplay bị chặn, hai màn overlay, skip giữa câu, timeout, reconnect, đổi âm lượng/tắt đọc trong lượt, mất mạng; không đọc trùng hoặc để tiếng lượt cũ chồng lượt mới. Không đọc nội dung comment tùy ý trong phần bắt buộc này.
- Chạy cả 7 nghi thức với đủ 40 người; đo nhịp khung hình thực trên máy phát ở 30 FPS, theo dõi CPU/GPU và lỗi console. Ghế giữ DOM theo ID, chỉ cập nhật khi cần để tránh dựng lại 40 × 5 frame theo mỗi thay đổi không liên quan.
- Tổng duyệt liên tục tối thiểu 30 phút trên server thử dùng data riêng; không đưa mô phỏng vào top thật.
- OBS 1080×1920/30 FPS: ghi một đoạn thử, kiểm tra chữ, chuyển bảng, nhạc/chuông và nguồn tiếng. Khi phát thử thật, xem từ điện thoại tài khoản khác để chốt safe area.
- Sao lưu cấu hình/thống kê và bản source đang dùng trước khi chuyển. Chỉ refresh Browser Source giữa hai lượt. Giữ bản cũ để quay lại nếu lỗi; không xóa top hoặc chạy reset như một bước mặc định.

Điều kiện dùng bản mới cho phiên live: các kiểm thử trên đạt, đủ 40 chỗ, quà/luật hiển thị đúng, điều khiển admin tới được OBS, giọng Việt có trong bản ghi OBS và vùng bình luận thực không che nội dung cần đọc. Xác nhận comment/quà thật cần phiên thử thật; simulator không thay thế bước này.

## Phần làm sau khi buổi live đầu ổn định

- Chu kỳ giới thiệu ngắn tự động, có công tắc tắt.
- Tùy chọn đổi bên bảng và chỉnh vùng an toàn bằng kéo/thả ở admin.
- Danh hiệu đóng góp nếu người dùng chốt tên, ngưỡng và cách tính theo phiên/tích lũy.
- Thêm asset, giọng khác, đọc tên người tặng/comment hoặc nghi thức mới theo nhu cầu thực tế sau live. Giọng đọc quẻ đã thuộc phần bắt buộc trước live.

Không đưa những phần này vào đường găng của đợt 16 → 40 và sắp lại bảng phụ.

## Kết quả bàn giao khi triển khai

1. Màn chùa gỗ 40 chỗ và demo 40 người.
2. Bảng comment/quà và bảng top ở giữa hai bên, thu/mở từ admin.
3. Nội dung giải thích bám đúng luật hiện tại.
4. Bộ 24 lời xăm và audio Việt miễn phí đã kiểm tra; nghe thử và chỉnh âm lượng ở admin.
5. Ảnh đối chiếu thu/mở/xin xăm/đại lễ và một đoạn ghi OBS có lời đọc.
6. Kết quả kiểm thử, hướng dẫn vận hành ngắn và cách quay lại bản trước.

Sơ đồ kèm trong chat chỉ mô tả phân vùng và trạng thái đóng/mở, chưa chứng minh lưới 40 đã vừa với sprite/nền thật. Bước P0.1 là cổng kiểm tra việc đó trước khi thay màn phát.
