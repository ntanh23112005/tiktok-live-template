# Đặt file âm thanh meme vào đây

V1.3 đã có đủ 12/12 cue. Ba bản gốc ở source/. Bộ đoạn ngắn đang phát được ghi trong config/user-sounds.json, hướng dẫn ở docs/AM-THANH-DA-NAP.md. Các mốc meme phát tiếng cùng động tác; riêng thẻ đọc xong mới vỗ tay.

Đặt file cạnh README này. Có thể dùng MP3, WAV, M4A hoặc OGG thật; giữ đúng tên cơ sở, không chỉ đổi đuôi file. Mỗi tên chỉ nên có một bản. Sau khi chép, bấm **Nạp lại âm thanh** trong admin; không cần sửa code. Tool tự đọc thời lượng để chờ clip phát xong rồi cho nhân vật về chỗ.

| Tên file đề xuất | Nội dung cần soạn | Thời điểm |
|---|---|---|
| `vo-tay.mp3` | Tiếng vỗ tay rõ, vui; khoảng 1–3 giây | Sau vái, đủ 10 tim, follow/share |
| `hoa-hong-1.mp3` | Câu meme chào/cảm ơn khi nhận hoa hồng | Sau khi đọc hết thẻ 1–2 xu |
| `dong-cua-hang.mp3` | Câu meme đóng cửa hang, hẹn trận sau | Lúc cửa đóng, sau 1,5 giây của cảnh |
| `compa-antony.mp3` | Thoại/meme Antony xoay compa | Trong lúc xoay, sau 1,8 giây |
| `siuuu.mp3` | Tiếng SIUUU của nhân vật meme | Lúc tiếp đất, sau 2,3 giây |
| `ole-cam-lai.mp3` | Thoại/chant meme Ole cầm lái | Trong lúc lái xe, sau 1,8 giây |
| `fergie-time.mp3` | Bình luận/câu meme bù giờ, ngược dòng | Lúc vào lưới, sau 2,3 giây |
| `ggmu-mo-hoi.mp3` | Đoạn meme/cổ vũ đại tiệc, không cần cả bài hát | Carrick mở hội, sau 2,2 giây |
| `khan-dai.mp3` | Tiếng khán đài tuỳ chọn | Thay clip GGMU nếu chưa có ggmu-mo-hoi; không phát chồng |

Nên chọn clip meme khoảng 2–8 giây; giới hạn nhận file là 120 giây. Chưa có file nào thì cue đó im lặng, không phát tiếng tổng hợp thay thế.

`voice/` chứa lời đọc Tiến Đạt do tool tạo sẵn: `follow-thanks.wav`, `share-thanks.wav`, `likes-thanks.wav`. Bạn không cần tự soạn ba file này. Bộ 99 thẻ nằm riêng tại `public/assets/fan-cards/`.

Các file hiệu ứng cũ: `public/assets/mu-cave-v1/clap.wav`, `crowd.wav`, `door.wav`, `kick.wav`, `whistle.wav`. Bản V1.2 giữ file để tham khảo nhưng không nạp chúng khi phát.
