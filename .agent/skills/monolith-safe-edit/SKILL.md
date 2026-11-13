---
name: monolith-safe-edit
description: Quy tắc chỉnh sửa an toàn cho các file mã nguồn lớn như app.js và index.html trong dự án vocab-flashcard.
---

# Quy tắc sửa file lớn an toàn
1. **Định vị trước khi sửa:** Luôn tìm chính xác số dòng của hàm, biến hoặc thẻ HTML liên quan trước khi chỉnh sửa. Không đọc tràn lan hoặc đoán tên hàm.
2. **Sửa cục bộ (Surgical Edits):** Chỉ thay thế đúng khối code cần cập nhật. Tuyệt đối không xóa bỏ hoặc thay thế code hiện có bằng placeholder kiểu `// ... code cũ ...`.
3. **Kiểm tra cấu trúc:** Sau khi sửa `app.js` hoặc `index.html`, kiểm tra kỹ các dấu ngoặc đóng/mở `{ }`, `( )` và thẻ đóng HTML để đảm bảo không lỗi cú pháp.
