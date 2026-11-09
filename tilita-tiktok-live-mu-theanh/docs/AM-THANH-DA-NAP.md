# Bộ âm thanh chủ live cung cấp

Đã nạp vào `public/assets/sounds/`. Ba file gốc giữ nguyên trong `public/assets/sounds/source/`.

| Cue | Nguồn | Thời lượng |
|---|---|---:|
| vo-tay | clap | khoảng 3,4 giây |
| hoa-hong-1 | clap | khoảng 3,4 giây |
| dong-cua-hang | goal | khoảng 3,6 giây |
| compa-antony | goal | khoảng 3,6 giây |
| siuuu | siuuuu | khoảng 2,1 giây |
| ole-cam-lai | goal → clap | khoảng 5 giây |
| fergie-time | goal → clap → siuuuu | khoảng 5,8 giây |
| ggmu-mo-hoi | goal → clap → siuuuu | khoảng 5,8 giây |
| khan-dai | goal | khoảng 3,6 giây |

Theo lựa chọn mới của chủ live, đã cắt đoạn mạnh và nối tiếp các phần theo thứ tự trên, giữ tốc độ và cao độ gốc, làm mượt đầu/cuối đoạn cắt. Điểm cắt được chọn theo năng lượng âm thanh và lưu trong config/user-sounds.json. Ba lời cảm ơn Tiến Đạt trong voice/ vẫn dùng như trước, tổng cộng đủ 12/12 cue. Thời lượng decoder MP3 có thể chênh vài chục mili giây; ứng dụng dùng thời lượng thực đọc được từ file.

Tiếng meme đồng bộ với động tác của cảnh V1.3. Riêng 1–2 xu đọc đủ thẻ, giữ thêm 1,5 giây, vỗ tay rồi về chỗ. Thay clip dài hơn cảnh vẫn đợi hết tiếng; Skip dừng ngay. Nhạc nền GGMU không đổi.

Muốn dựng lại bản ngắn: scripts/build-short-meme-sounds.py dùng ba file gốc trong source/, cần Python + FFmpeg. Script import-user-sounds.py là công thức ghép đầy đủ cũ. LIVE chỉ dùng file đã dựng sẵn, không cần Python/FFmpeg.

Bản ghép dài trước khi rút: output/before-meme-v1.3/sounds/. Ba file gốc source/ không bị sửa.
