---
name: verify-before-push
description: Quy trình tự kiểm tra lỗi trên trình duyệt trước khi chạy lệnh git push lên nhánh main.
---

# Quy trình nghiệm thu trước khi đẩy Git
1. **Kiểm tra trên trình duyệt:** Sau khi hoàn tất chỉnh sửa code, mở ứng dụng trên trình duyệt tích hợp, thao tác thử trực tiếp qua tính năng vừa thêm hoặc sửa.
2. **Soát lỗi Console:** Kiểm tra DevTools Console đảm bảo không phát sinh lỗi `Uncaught TypeError`, `ReferenceError` hay lỗi thiếu phần tử DOM (`null`).
3. **Cập nhật Git:** Chỉ sau khi xác nhận giao diện hiển thị đúng và không có lỗi console mới tiến hành `git add .`, `git commit -m "..."` và `git push origin main`.
