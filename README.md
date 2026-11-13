# ⚡ VocabMaster SRS - Ứng Dụng Học Từ Vựng Thông Minh (Spaced Repetition System)

**VocabMaster SRS** là ứng dụng web Single Page Application (SPA) học từ vựng tiếng Anh chuyên sâu, kết hợp phương pháp ghi nhớ ngắt quãng **Spaced Repetition System (SRS)** 6 mốc chuẩn khoa học, giao diện hiện đại **Tailwind CSS**, hệ thống **Gamification (EXP, Level Up, Streak 🔥, Daily Quests)** và **4 chế độ luyện tập đa giác quan**.

---

## 🌟 1. CÁC TÍNH NĂNG NỔI BẬT THEO YÊU CẦU

### 1️⃣ QUẢN LÝ TỪ VỰNG & BỘ SƯU TẬP (COLLECTIONS)
- **Quản lý Bộ Sưu Tập (Decks)**: Tạo, chỉnh sửa tên, mô tả, màu sắc đại diện và xóa chủ đề từ vựng (ví dụ: *💼 TOEIC 750+ Thông Dụng, 💻 Công Nghệ & Lập Trình, 🗣️ Giao Tiếp Hàng Ngày, 🎓 IELTS Academic Band 7.5+*).
- **Thêm từ thông minh (Smart Auto-Lookup & AI API)**:
  - Tự động gọi **Free Dictionary API** và từ điển song ngữ khi nhập từ tiếng Anh để lấy phiên âm IPA, phát âm audio MP3, từ loại, nghĩa tiếng Việt, câu ví dụ và sinh sẵn 3 phương án gây nhiễu cho trắc nghiệm.
  - Cho phép người dùng chỉnh sửa, tùy biến toàn bộ nội dung trước khi lưu vào bộ sưu tập.
  - **Hỗ trợ AI Đọc File & Thêm Hàng Loạt**: Tải file văn bản (`.txt`, `.csv`, `.json`) hoặc dán danh sách từ vựng, hệ thống sẽ tự động tra cứu hàng loạt.
- **Sao lưu & Khôi phục (JSON Backup & Restore)**:
  - Xuất toàn bộ dữ liệu (từ vựng, tiến độ SRS, mốc level, EXP, chuỗi ngày học Streak, trạng thái nhiệm vụ) ra file `.json`.
  - Nhập ngược lại từ file `.json` để khôi phục 100% dữ liệu bất kỳ lúc nào mà không sợ mất khi xóa cache trình duyệt.

---

### 2️⃣ THUẬT TOÁN ÔN TẬP THEO CHU KỲ (SPACED REPETITION SYSTEM - SRS)
Ứng dụng cài đặt thuật toán Spaced Repetition theo đúng **6 mốc chu kỳ chuẩn**:
- **Lần 1 (Level 1)**: Học từ mới (Ngày 1) ➔ Ôn sau 1 ngày (`Day +1`).
- **Lần 2 (Level 2)**: Ôn sau 1 ngày ➔ Ôn sau 3 ngày kể từ lần 2 (`Day +3`).
- **Lần 3 (Level 3)**: Ôn sau 3 ngày ➔ Ôn sau 7 ngày kể từ lần 3 (`Day +7`).
- **Lần 4 (Level 4)**: Ôn sau 7 ngày ➔ Ôn sau 14 ngày kể từ lần 4 (`Day +14`).
- **Lần 5 (Level 5)**: Ôn sau 14 ngày ➔ Ôn sau 30 ngày kể từ lần 5 (`Day +30`).
- **Lần 6 (Level 6)**: Ôn sau 30 ngày ➔ Nới rộng 60 ngày nếu nhớ vững hoặc chuyển sang trạng thái *Đã thuộc vững (Mastered)*.
- **Logic đánh giá**:
  - Khi ôn tập trả lời đúng / bấm "Đã nhớ": Tăng Level lên 1 bậc và tự động tính `nextReviewDate` theo khoảng cách chu kỳ tương ứng.
  - Khi trả lời sai / bấm "Chưa nhớ": Chuyển về Level 1 và đặt `nextReviewDate` là hôm nay để ôn lại ngay.
- **Tự động lọc danh sách "Từ cần ôn tập hôm nay"**:
  - Banner thông báo trực quan số từ đến hạn ôn tập hôm nay (`nextReviewDate <= today`).
  - Nút bấm 1-click **"Ôn tập từ đến hạn ngay"** để lọc ngay danh sách cần học.

---

### 3️⃣ CÁC CHẾ ĐỘ LUYỆN TẬP & PHÍM TẮT TIỆN LỢI
1. 🎴 **Chế độ Flashcard 3D**:
   - Mặt trước: Từ tiếng Anh lớn, phiên âm IPA, nút nghe phát âm chuẩn, huy hiệu SRS mốc hiện tại.
   - Bấm vào thẻ (hoặc phím `F` / `Enter`) để lật thẻ 3D sang mặt sau: Nghĩa tiếng Việt, từ loại, câu ví dụ ngữ cảnh (tiếng Anh & tiếng Việt), số lần đã ôn tập.
   - Hai nút phản hồi SRS:
     - ❌ **Chưa nhớ** (Phím tắt `1`): Giảm về mốc 1, lịch ôn lại hôm nay.
     - ✅ **Đã nhớ** (Phím tắt `2`): Tăng mốc SRS, nới rộng chu kỳ theo 6 mốc.
2. 📝 **Chế độ 1: Trắc nghiệm 4 lựa chọn (Multiple Choice)**:
   - Hiển thị từ tiếng Anh, phát âm, từ loại và 4 phương án nghĩa tiếng Việt.
   - Phím tắt: Bấm phím `1`, `2`, `3`, `4` để chọn phương án.
   - Tự động cộng EXP, phát âm thanh chúc mừng và hiện giải thích ví dụ ngữ cảnh.
3. ✍️ **Chế độ 2: Nhìn từ tiếng Anh ➔ Ghi nghĩa tiếng Việt**:
   - Kiểm tra khả năng nhớ nghĩa chủ động.
   - Nút **"Hiện gợi ý"**: Hiển thị câu ví dụ với từ vựng được che đi (`_______`).
   - Tích hợp **Fuzzy Matching thông minh**: So sánh độ tương đồng nghĩa, chấp nhận gõ không dấu, bỏ qua dấu câu.
   - Phím `Enter` để kiểm tra kết quả, bấm `Enter` lần nữa để chuyển sang từ tiếp theo.
4. 🔤 **Chế độ 3: Nhìn nghĩa tiếng Việt ➔ Ghi từ tiếng Anh (Chính xác chính tả)**:
   - Hiển thị nghĩa tiếng Việt và câu ví dụ dịch.
   - Nút **"Hiện chữ cái đầu"**: Hiển thị độ dài từ và chữ cái đầu (ví dụ: `s _ _ _ _ _ _ _ _ y`).
   - Kiểm tra chính xác chính tả tiếng Anh (Spelling check).
   - Tự động phát âm từ tiếng Anh ngay khi gõ đúng đáp án!
- **Phím tắt chung**:
  - Phím `Space`: Phát âm lại từ vựng bất cứ lúc nào trong tất cả các chế độ.
  - Phím `Enter`: Chuyển sang từ tiếp theo sau khi đã hoàn thành câu hỏi.

---

### 4️⃣ GAMIFICATION (EXP, STREAK & NHIỆM VỤ HÀNG NGÀY)
- **Hệ Thống EXP & Level Up**:
  - Trả lời đúng mỗi câu: `+15 EXP`.
  - Hệ thống cấp bậc: *Lv 1: Tập Sự ➔ Lv 2: Học Viên ➔ Lv 3: Chiến Binh ➔ Lv 4: Tinh Anh ➔ Lv 5: Bậc Thầy ➔ Lv 6: Huyền Thoại*.
  - Thanh tiến độ EXP hiển thị trực tiếp trên Header với hiệu ứng gradient sinh động.
  - Khi thăng cấp (Level Up): Bắn pháo hoa rực rỡ (**Confetti Cannon**) toàn màn hình, chuông âm thanh fanfare và hộp thoại vinh danh thăng cấp!
- **Chuỗi ngày học (Streak 🔥)**:
  - Đếm số ngày học liên tục mỗi khi hoàn thành ôn tập trong ngày.
  - Lưu trữ ngày học gần nhất: Tự động cộng chuỗi nếu học liên tiếp các ngày, giữ nguyên nếu học nhiều lần trong ngày, đặt lại chuỗi nếu bỏ lỡ.
  - Biểu tượng ngọn lửa 🔥 nhấp nháy phát sáng trên thanh công cụ.
- **Nhiệm vụ hàng ngày (Daily Quests)**:
  - Bấm vào nút Hộp quà 🎁 trên Header để mở bảng nhiệm vụ:
    1. 🎯 *Hoàn thành 1 bài ôn tập từ vựng* (`+30 EXP`)
    2. 📖 *Thêm 2 từ vựng mới vào kho* (`+40 EXP`)
    3. ⚡ *Trả lời đúng 5 câu liên tiếp* (`+50 EXP`)
    4. 🧠 *Ôn tập 6 từ đến hạn SRS hôm nay* (`+60 EXP`)
  - Nhiệm vụ tự động theo dõi tiến độ, hiển thị nút **"Nhận thưởng"** kèm chấm đỏ thông báo khi có nhiệm vụ hoàn thành.

---

### 5️⃣ GIAO DIỆN & TRẢI NGHIỆM (UI/UX)
- **Responsive 100%**: Hoạt động mượt mà trên cả Mobile, Tablet và Desktop.
- **Chuyển đổi Dark Mode / Light Mode**:
  - Nút chuyển chế độ Mặt Trời ☀️ / Mặt Trăng 🌙 trên Header.
  - Giao diện Sáng (Clean Slate, Indigo Modern) & Giao diện Tối (Fintech Deep Space Glassmorphism).
  - Tự động ghi nhớ sở thích giao diện vào `localStorage`.
- **Phát âm chuẩn**:
  - Ưu tiên file âm thanh MP3 từ Free Dictionary API.
  - Tự động fallback sang **Web Speech API (`window.speechSynthesis`)** với giọng tiếng Anh chuẩn (en-US Natural) khi file MP3 không khả dụng.
- **Lưu trữ dữ liệu an toàn**:
  - 100% dữ liệu (bộ từ vựng, danh sách thẻ, mốc SRS, lịch ôn, EXP, streak, quests, danh sách câu sai, cài đặt phần học) tự động lưu vào `localStorage`.

---

### 6️⃣ TÍNH NĂNG MỚI NÂNG CẤP (V3.5+) 🚀
1. ⚠️ **Mistake Review Pool (Kho Lưu Vết Câu Chọn Sai & Ôn Lại Thông Minh)**:
   - Tự động ghi nhận mọi câu trả lời sai từ cả 4 chế độ vào danh sách riêng (`vocabmaster_mistakes_pool_v3`) trong `LocalStorage`, không bị mất khi F5/reload trang.
   - Nút 1-click **"Ôn câu sai (X)"** trên thanh điều khiển Study View và tab **"⚠️ Cần lưu ý"** trong Quản Lý Thư Viện.
   - Khi người dùng trả lời **ĐÚNG** lại câu đó trong chế độ ôn: Hệ thống tự động xóa từ khỏi danh sách câu sai, cập nhật số liệu và hiển thị pháo hoa chúc mừng khi giải quyết hết các câu sai.
2. 📊 **Theo Dõi & Thống Kê Tiến Độ Bộ Sưu Tập (Multi-Segment Progress)**:
   - Ghi nhận 3 trạng thái phân định rõ ràng cho từng câu: **Chưa ôn (Unstudied)** / **Đang ôn (Reviewing)** / **Đã thuộc (Mastered)**.
   - Hiển thị tỷ lệ tiến độ dạng số: `Đã ôn: X/Y câu (Z%)` kèm 4 huy hiệu phân loại trực quan.
   - Thanh tiến trình đa đoạn (Multi-segment bar): Xanh lá (Đã thuộc), Xanh dương (Đang ôn), Xám (Chưa ôn).
   - Nút **"Học lại từ đầu" (Reset Tiến Độ)**: Đặt lại toàn bộ tiến độ của riêng một bộ từ vựng với hộp thoại xác nhận an toàn.
3. 📦 **Chia Nhỏ Bộ Sưu Tập (Sub-Decks / Batches)**:
   - Cho phép chia linh hoạt một bộ từ lớn thành các phần nhỏ (10, 20 hoặc 25 câu/phần).
   - Người dùng có thể chọn học từng phần nhỏ riêng biệt hoặc học toàn bộ bộ sưu tập.
   - Hiển thị thanh tiến độ và thống kê riêng cho từng phần nhỏ.
   - Mọi tiến độ học của phần nhỏ đều đồng bộ 100% theo thời gian thực với bộ sưu tập tổng và hệ thống SRS.
4. ⚡ **Học Từ Vựng Tương Tác (Interactive Vocabulary Learning Session - 2 Cột 50/50)**:
   - **Màn hình 1 - Thiết lập phiên học (Setup)**:
     - Chọn nguồn: *Lặp lại Ngắt quãng (SRS)* hoặc *Chọn Tùy Ý*.
     - Bộ lọc 5 mức độ ghi nhớ SRS (No Memory 🔴, Fragile Memory 🟠, Active Recall 🟡, Confident Recall 🔵, Long-Term Retention 🟢) kèm badge đếm số từ trực quan.
     - Chọn 4 dạng câu hỏi: *Cả hai (x2 câu Nghe + Định nghĩa)*, *Trộn (1 câu ngẫu nhiên)*, *Chỉ nghe (Nghe & viết)*, *Định nghĩa & Nghĩa (Đọc gõ từ)*.
     - Tùy chọn học liên tục toàn màn hình (Fullscreen API) & tự động phát âm thanh sau khi gửi.
   - **Màn hình 2 - Không gian phiên học tương tác (Active Session)**:
     - Top Bar: Bộ đếm câu hỏi `X/N`, điểm thành thạo SRS dạng `0.0/10 • No Memory`, đồng hồ đếm ngược 28s đổi màu (Xanh -> Vàng -> Đỏ).
     - Cột trái: Gõ từ vựng, micro nhận diện giọng nói (Web Speech Recognition), gợi ý độ dài từ (`_ _ _ _ _`), nút *Tôi không nhớ* (ESC), nút *Gửi câu trả lời* (Enter).
     - Cột phải: Trạng thái chờ với tai nghe sóng âm (cho dạng nghe) hoặc thẻ preview định nghĩa/nghĩa tiếng Việt (cho dạng định nghĩa). Sau khi trả lời, mở khóa đầy đủ từ vựng + phiên âm + giải thích tiếng Anh + nghĩa tiếng Việt + ví dụ song ngữ kèm nút *Phân tích* tách từ tra cứu.
     - Chấm điểm ký tự Diff: Thuật toán so khớp LCS trực quan (xanh lá = đúng, đỏ = sai/thừa, vàng = thiếu).
     - Cơ chế bắt buộc sửa lỗi (Force Retype): Bắt buộc gõ đúng 100% từ vựng mới mở khóa nút *Từ tiếp theo*.
     - Phím tắt tối ưu: `Ctrl` nghe lại phát âm, `Enter` gửi/chuyển câu, `ESC` không nhớ.

---

## 🚀 2. HƯỚNG DẪN SỬ DỤNG & CHẠY ỨNG DỤNG

Ứng dụng chạy trực tiếp trên trình duyệt máy khách (Client-Side), không cần cài đặt Node.js hay bất kỳ server nào.

### Cách mở nhanh:
Mở trực tiếp file sau bằng trình duyệt (Google Chrome, Microsoft Edge, Mozilla Firefox, Cốc Cốc, Brave, Safari):
```text
file:///c:/AI/file1/vocab-flashcard/index.html
```

Hoặc nhấp đúp chuột vào file `index.html` trong thư mục `c:\AI\file1\vocab-flashcard\`.
