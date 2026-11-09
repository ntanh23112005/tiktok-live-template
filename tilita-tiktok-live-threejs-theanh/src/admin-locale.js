// Administration is Vietnamese. Broadcast rules and scene captions stay English.
const ruleText = {
  comment: ['Bình luận', 'Vẽ @username', 'Vẽ tên'],
  likes: ['100 lượt thích / người', 'Vẽ @username', 'Đủ 100 lượt thích'],
  follow: ['Theo dõi', 'Vẽ ảnh đại diện nhỏ', 'Ảnh đại diện nhỏ'],
  coin1: ['1 coin', 'Ưu tiên vẽ @username', 'Ưu tiên vẽ tên'],
  coin10: ['10 coin', 'Vẽ ảnh đại diện nhỏ', 'Ảnh đại diện nhỏ'],
  coin30: ['30 coin', 'Vẽ ảnh đại diện lớn', 'Ảnh đại diện lớn'],
  coin50: ['50 coin', 'Ảnh đại diện vừa + tên bên dưới', 'Ảnh vừa + tên'],
  coin100: ['100 coin', 'Ảnh đại diện lớn + tên bên dưới', 'Ảnh lớn + tên'],
  coin500: ['500+ coin', 'Siêu tượng ×200', 'Siêu tượng ×200']
};

export function adminRule(rule) {
  if (!rule) return rule;
  const text = ruleText[rule.id];
  return text ? { ...rule, trigger: text[0], label: text[1], short: text[2] } : rule;
}

const messages = {
  'Could not send the command.': 'Không thể gửi lệnh. Hãy kiểm tra ứng dụng đang chạy.',
  'Failed to fetch': 'Không kết nối được với ứng dụng. Hãy kiểm tra ứng dụng đang chạy rồi tải lại trang.',
  'Load failed': 'Không tải được dữ liệu. Hãy kiểm tra kết nối rồi thử lại.',
  'NetworkError when attempting to fetch resource.': 'Kết nối bị gián đoạn. Hãy thử lại.',
  'Choose a PNG, JPG or WebP under 5 MB.': 'Chọn ảnh PNG, JPG hoặc WebP dưới 5 MB.',
  'Could not read this image.': 'Không đọc được ảnh này. Hãy chọn ảnh khác.',
  'Tier selected. The current drawing will finish before the next event.': 'Đã chọn mốc. Lượt đang vẽ sẽ hoàn thành trước khi chạy lượt tiếp theo.',
  'Fullscreen is unavailable in this browser.': 'Trình duyệt này không hỗ trợ chế độ toàn màn hình.',
  'Sound is enabled in this window.': 'Đã bật âm thanh trong cửa sổ này.',
  'Click directly inside the output window to enable sound.': 'Bấm trực tiếp trong màn hình phát để bật âm thanh.',
  'OBS URL copied. Set the source to 1080 × 1920.': 'Đã sao chép đường dẫn OBS. Đặt kích thước nguồn là 1080 × 1920.',
  'Music files must be under 50 MB.': 'Tệp nhạc phải nhỏ hơn 50 MB.',
  'Choose MP3, WAV, OGG, M4A, AAC, FLAC or WebM.': 'Chọn tệp nhạc MP3, WAV, OGG, M4A, AAC, FLAC hoặc WebM.',
  'The music file is empty.': 'Tệp nhạc không có dữ liệu.',
  'Choose a music file first.': 'Hãy chọn tệp nhạc trước.',
  'Music file not found.': 'Không tìm thấy tệp nhạc.',
  'This event is no longer waiting.': 'Lượt này không còn trong hàng chờ.',
  'Priority must be a whole number from 0 to 9999.': 'Ưu tiên phải là số nguyên từ 0 đến 9999.',
  'Each interaction must be enabled or disabled.': 'Mỗi luật cần được chọn bật hoặc tắt.',
  'TikTok usernames can contain letters, numbers, periods and underscores only.': 'Tên tài khoản TikTok chỉ được có chữ cái, chữ số, dấu chấm và dấu gạch dưới.',
  'Enter your TikTok @username before connecting.': 'Hãy nhập tài khoản TikTok trước khi kết nối.',
  'The queue has reached 1000 events. Finish queued events before adding more.': 'Hàng chờ đã đủ 1000 lượt. Hãy chạy bớt trước khi thêm lượt mới.',
  'Gift event ID is missing; inspect the payload before awarding an event.': 'Sự kiện quà thiếu mã định danh nên chưa được xếp lượt. Hãy kiểm tra dữ liệu quà.',
  'A new session report started. Queue and interaction records were preserved.': 'Đã bắt đầu báo cáo phiên mới. Hàng chờ và dữ liệu tương tác được giữ nguyên.',
  'The LIVE session has ended.': 'Buổi phát trực tiếp đã kết thúc.',
  'TikTok disconnected.': 'Đã ngắt kết nối TikTok.',
  'TikTok connection error': 'Lỗi kết nối TikTok.',
  'Error while connecting': 'Kết nối TikTok chưa thành công.',
  'Failed to fetch room gifts.': 'Không tải được danh mục quà của phòng LIVE.',
  'The 3D scene paused. Reload the page to restore it.': 'Cảnh 3D đã tạm dừng. Hãy tải lại trang để khôi phục.',
  'Session report not found.': 'Không tìm thấy báo cáo phiên này.',
  'Invalid event type.': 'Loại tương tác không hợp lệ.',
  'Invalid coin amount.': 'Số coin không hợp lệ.',
  'Invalid like amount.': 'Số lượt thích không hợp lệ.',
  'Unsupported avatar source.': 'Nguồn ảnh đại diện chưa được hỗ trợ.',
  'Invalid avatar redirect.': 'Đường dẫn chuyển tiếp của ảnh đại diện không hợp lệ.',
  'Could not load the avatar.': 'Không tải được ảnh đại diện.',
  'Avatar is too large.': 'Ảnh đại diện vượt quá kích thước cho phép.',
  'Upload music from the local studio only.': 'Hãy tải nhạc lên từ màn hình quản trị trên máy này.',
  'Control commands must come from the local studio.': 'Lệnh điều khiển phải được gửi từ màn hình quản trị trên máy này.',
  'This server only accepts localhost requests.': 'Ứng dụng chỉ nhận yêu cầu từ chính máy đang chạy.',
  'Invalid request origin.': 'Nguồn gửi yêu cầu không hợp lệ.',
  'Invalid JSON': 'Dữ liệu gửi lên không đúng định dạng.',
  'Request is too large': 'Dữ liệu gửi lên quá lớn.',
  'Command not found.': 'Không tìm thấy lệnh điều khiển.',
  'Invalid path.': 'Đường dẫn không hợp lệ.',
  'Run npm run build before opening the output.': 'Hãy chạy lại tệp Start-Live.cmd để chuẩn bị màn hình phát.'
};

export function adminMessage(value) {
  const text = String(value ?? '');
  if (messages[text]) return messages[text];
  let match = /^(.*) · Retrying in ([\d.]+)s$/.exec(text);
  if (match) return `${adminMessage(match[1])} · Thử kết nối lại sau ${match[2]} giây`;
  if (/requires a Business (?:plan|subscription)/i.test(text)) {
    return 'Euler Stream từ chối yêu cầu này vì cần gói Business.';
  }
  match = /^Account (@.+) is not LIVE right now\.$/.exec(text);
  if (match) return `Tài khoản ${match[1]} hiện chưa phát trực tiếp.`;
  match = /^Connected to LIVE (@.+)\.$/.exec(text);
  if (match) return `Đã kết nối buổi phát trực tiếp của ${match[1]}.`;
  match = /^Missing coin value for gift (.+); no event was awarded to avoid an incorrect tier\.$/.exec(text);
  if (match) return `Quà ${match[1]} thiếu giá trị coin nên chưa được xếp lượt, tránh chọn sai mốc.`;
  match = /^Value (\w+) is invalid$/.exec(text);
  if (match) return 'Giá trị cài đặt không hợp lệ. Hãy kiểm tra lại.';
  match = /^Output URL: (.+)$/.exec(text);
  if (match) return `Đường dẫn màn hình phát: ${match[1]}`;
  match = /^Sent \+25 DEMO likes from (.+)\.$/.exec(text);
  if (match) return `Đã gửi thử 25 lượt thích từ ${match[1]}.`;
  if (!text || /[\u00c0-\u024f\u1e00-\u1eff]/.test(text)) return text;
  // External connector errors stay in the server log; keep the operator message Vietnamese.
  const code = /\b(?:E[A-Z_]{3,}|HTTP\s*\d{3}|429|403|401|500|502|503)\b/.exec(text)?.[0];
  return `Không thể hoàn tất thao tác. Hãy kiểm tra kết nối rồi thử lại.${code ? ` Mã lỗi: ${code}.` : ''}`;
}
