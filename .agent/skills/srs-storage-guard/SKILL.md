---
name: srs-storage-guard
description: Bảo toàn dữ liệu từ vựng, tiến độ SRS, EXP và lịch sử học tập trong LocalStorage.
---

# Quy tắc bảo toàn dữ liệu LocalStorage
1. **Kiểm tra Schema hiện tại:** Trước khi thêm tính năng liên quan đến từ vựng hoặc thống kê, phải đọc cách `app.js` đang đọc/ghi `localStorage`.
2. **Tương thích ngược bắt buộc:** Dữ liệu cũ của người dùng có thể thiếu các trường mới (ví dụ: `score`, `srsLevel`, `status`, `studySessions`, `totalStudyTimeMs`). Luôn dùng giá trị mặc định an toàn khi đọc dữ liệu (ví dụ: `word.score ?? 0`, `Array.isArray(sessions) ? sessions : []`).
3. **Không đổi tên Key:** Giữ nguyên toàn bộ các key `localStorage` đang dùng để tránh làm mất dữ liệu từ vựng đã lưu của người dùng.
