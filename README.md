# ⚡ VocabMaster - Flashcard Học Từ Vựng Thông Minh

**VocabMaster** là ứng dụng web học từ vựng tiếng Anh hiện đại, kết hợp tự động tra cứu từ điển bằng API, phát âm chuẩn IPA, dịch nghĩa ngữ cảnh tiếng Việt, **hệ thống chia nhỏ theo Bộ Từ Vựng (Decks)** và **3 chế độ luyện tập chuyên sâu**:
1. **Trắc Nghiệm: Anh ➔ Việt**
2. **Trắc Nghiệm: Việt ➔ Anh**
3. **Gõ Nghĩa (Recall / Type-In)**

---

## ✨ 1. Tính Năng Mới & Nổi Bật

### 📚 A. Hệ Thống Bộ Từ Vựng (Vocabulary Decks - Chia Nhỏ Để Học Dễ Hơn)
- **Chia nhỏ từ vựng theo chủ đề**: Người học không bị quá tải khi học hàng trăm từ cùng lúc, mà có thể chia thành các gói nhỏ từ 10 - 20 từ (ví dụ: *IELTS Academic, Giao Tiếp Hàng Ngày, Tính Cách & Phẩm Chất, Công Sở - Email...*).
- **Tạo và Quản lý Bộ Từ Vựng Mới**:
  - Tạo bộ từ với tên, mô tả mục tiêu và màu sắc đại diện (Indigo, Emerald, Amber, Rose, Cyan).
  - Thống kê chi tiết tiến độ: Số từ trong bộ, số từ đã thuộc và thanh phần trăm hoàn thành.
  - Nút **"Luyện Tập Bộ Này"**: 1-click kích hoạt chế độ học riêng cho bộ từ đó.
  - Sửa tên, đổi mô tả và xóa bộ từ linh hoạt.
- **Phân loại khi thêm từ mới**: Khi tra cứu và lưu từ mới, bạn có thể chọn ngay bộ từ vựng đích để lưu vào.

### 🎯 B. Tách Biệt 2 Chế Độ Trắc Nghiệm Riêng Biệt (Dual Multiple Choice Modes)
1. **Mode 1: Trắc Nghiệm Anh ➔ Việt**
   - Mặt trước / Câu hỏi: Từ tiếng Anh lớn, phiên âm IPA, nút nghe phát âm chuẩn và từ loại.
   - 4 Phương án A, B, C, D: 4 nghĩa tiếng Việt (1 đáp án chuẩn + 3 phương án gây nhiễu chân thực).
   - Phím tắt: `1`, `2`, `3`, `4` hoặc `A`, `B`, `C`, `D`. Phím `Space` để nghe lại âm thanh.
2. **Mode 2: Trắc Nghiệm Việt ➔ Anh**
   - Mặt trước / Câu hỏi: Nghĩa tiếng Việt và từ loại (ẩn từ tiếng Anh để luyện phản xạ nhớ từ).
   - 4 Phương án A, B, C, D: 4 từ vựng tiếng Anh.
   - Tự động phát âm chuẩn từ tiếng Anh ngay khi bạn chọn đúng đáp án!
3. **Mode 3: Gõ Nghĩa (Type Meaning / Write-In)**
   - Kiểm tra khả năng nhớ nghĩa chủ động.
   - Nút **"Hiện gợi ý"**: Hiển thị câu ví dụ ngữ cảnh với từ khóa mục tiêu được ẩn đi (`_______`).
   - **Fuzzy Matching thông minh**: Chấp nhận gõ không dấu, bỏ qua dấu câu, tính độ tương đồng từ (*Token Overlap & Levenshtein distance*).

### 🔍 C. Tra Cứu Tự Động Thông Minh (Smart Auto-Lookup)
- Tích hợp **Free Dictionary API** & **Google Translate API**.
- Tự động phân tích từ loại, phiên âm IPA, file audio MP3, dịch nghĩa tiếng Việt, câu ví dụ và sinh sẵn 3 đáp án sai cực kỳ chân thực.
- Hỗ trợ Text-to-Speech tự động (`window.speechSynthesis`) khi file MP3 không khả dụng hoặc bị trình duyệt chặn phát.

### 💾 D. Lưu Trữ & Quản Lý Dữ Liệu
- Toàn bộ dữ liệu lưu trên trình duyệt qua `localStorage` (`vocabmaster_cards_v2`, `vocabmaster_decks_v2`).
- Có sẵn **3 bộ từ mẫu** kèm **10 thẻ từ vựng học thuật cao cấp**.
- Xuất / Nhập sao lưu toàn bộ dữ liệu (cả bộ từ và thẻ từ) qua file **JSON**.

---

## 🚀 2. Hướng Dẫn Mở & Chạy Ứng Dụng

Ứng dụng hoàn toàn chạy trên client (không cần cài đặt Node.js hay npm).

### Cách mở nhanh nhất:
1. Mở file [**`c:\AI\file1\vocab-flashcard\index.html`**](file:///c:/AI/file1/vocab-flashcard/index.html) trực tiếp bằng trình duyệt (Chrome, Edge, Firefox, Cốc Cốc, Brave).
2. Hoặc dán đường dẫn sau vào thanh địa chỉ của trình duyệt:
   ```text
   file:///c:/AI/file1/vocab-flashcard/index.html
   ```
