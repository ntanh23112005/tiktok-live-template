# Việc cần chốt trước khi public

Đây là gói duyệt nội bộ, chưa đăng lên dịch vụ ngoài. Không coi gói ZIP này là bản đã nghiệm thu mọi nền tảng.

## Đã tách khỏi bản cá nhân

- Không chứa data/, output/, node_modules/, .env, log, ảnh/video kiểm thử hay username của phiên cá nhân.
- Không chứa ảnh cũ lấy từ repo tham khảo hoặc hai bản nhạc tụng tải ngoài.
- Engine hạt của gói community được viết mới, dùng Canvas và không lấy code engine cũ. Hiệu ứng có thể khác bản cá nhân.
- 99 quẻ/audio, cảnh chùa gỗ tạo riêng và ba bản nhạc không lời được giữ lại.
- Lần đầu chạy tạo data/ mới; Windows/Mac đều dùng cổng 3001, không dùng đường dẫn máy của tác giả.

## Chủ dự án cần duyệt giấy phép

Hai dependency TikTok đang khai báo AGPL-3.0-only. Không nên tuyên bố toàn bộ gói là MIT khi chưa xử lý điều kiện dependency. Đã kèm giấy phép của dependency và bản AGPL-3.0 đề xuất trong LICENSE-AGPL-3.0.PROPOSED.txt.

Chủ dự án cần chốt cách cấp phép cho mã và tài nguyên tự tạo trước khi đổi bản đề xuất thành LICENSE và đăng repo/release. Bản đề xuất hiện chưa tự cấp quyền đối với phần sở hữu của chủ dự án.

## Kiểm thử phát hành

- Windows: cần kiểm tra cả cài sạch, thử offline và một phiên LIVE thật trước khi gắn nhãn stable.
- macOS: launcher đã có, nhưng cần người dùng Mac Intel/Apple Silicon kiểm tra cài Node, chạy web, Browser Source và đường âm thanh OBS. Chưa có máy Mac thật trong phiên chuẩn bị này.
- README có hướng dẫn từ máy mới và mô phỏng trước khi kết nối LIVE.

## Cách chia sẻ sau khi duyệt

Đăng mã nguồn lên repo GitHub, đính kèm ZIP đầy đủ ở Releases. Giữ ba phần: hướng dẫn cài, ảnh/video demo không lộ dữ liệu riêng và mục báo lỗi. Không kèm dữ liệu người dùng vào những bản cập nhật sau.

Giai đoạn tiếp theo có thể làm bộ cài Windows/macOS kèm Node để người dùng không tự cài Node. Đó là sản phẩm đóng gói desktop riêng, cần build theo hệ điều hành/CPU và xử lý ký ứng dụng; gói hiện tại vẫn là mã nguồn chạy local.
