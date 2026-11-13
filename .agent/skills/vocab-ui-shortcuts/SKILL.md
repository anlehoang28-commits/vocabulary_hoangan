---
name: vocab-ui-shortcuts
description: Tiêu chuẩn thiết kế UI, xử lý Web Speech API và phân luồng phím tắt cho ứng dụng học từ vựng.
---

# Quy tắc giao diện & tương tác
1. **Đồng bộ Design System:** Tái sử dụng các biến màu, bo góc, bóng đổ và class sẵn có trong `styles.css`. Đặt tiền tố rõ ràng cho class mới để không làm vỡ layout các màn hình khác.
2. **Cô lập phím tắt (Keyboard Shortcuts):** Các sự kiện `keydown` (`Enter`, `Escape`, `Control`) phải kiểm tra xem màn hình/modal tương ứng có đang hiển thị (`active` / không bị `hidden`) hay không trước khi thực thi, tránh kích hoạt nhầm khi người dùng đang nhập liệu ở ô khác.
3. **An toàn âm thanh (Web Speech API):** Luôn kiểm tra hỗ trợ trình duyệt (`'speechSynthesis' in window`) và hủy âm thanh đang đọc dở (`speechSynthesis.cancel()`) trước khi phát âm từ mới.
