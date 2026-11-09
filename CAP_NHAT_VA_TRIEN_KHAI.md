# Cập nhật và triển khai app Chi Tiêu Gia Đình

Dành cho người sửa app. Có hai phần triển khai riêng: **app** (GitHub Pages) và **máy chủ Google Sheet** (Apps Script). Phần lớn lần cập nhật chỉ cần phần app.

- App: https://lkal-vietnam.github.io/WebAppChiTieu/
- Mã nguồn: https://github.com/lkal-vietnam/WebAppChiTieu (nhánh `main`)
- Dữ liệu đồng bộ: Google Sheet có hai trang `Transactions` và `Settings`

> Không ghi mật khẩu đồng bộ (`SECRET`) vào kho mã. Kho này công khai.

## 1. Trước khi đẩy bản mới

- [ ] Sao lưu dữ liệu: trên điện thoại, Cài đặt → **Sao lưu (JSON)**. Làm ít nhất trước mỗi lần đổi lớn.
- [ ] Chạy bộ kiểm thử đầu cuối (40 bước) và bộ kiểm tra giao diện (tương phản, vùng chạm ≥44px, không tràn ngang). Tất cả phải đạt.
- [ ] Nếu sửa `index.html`, `sw.js` hoặc thư mục `ocr/`: **tăng số phiên bản** trong `sw.js` (`const V='qltc-vN'`). Không tăng thì điện thoại có thể giữ bản cũ.
- [ ] Nếu đổi cấu trúc dữ liệu giao dịch: kiểm tra `Code.gs` có ghi và đọc đúng cột mới (`id, date, type, amount, cat, wallet, who, note, updated, deleted`).
- [ ] Không có file ảnh chụp thử hoặc tệp tạm trong thư mục kho.

## 2. Đẩy app lên

1. Commit và `git push origin main`.
2. Đợi 1–2 phút để GitHub Pages dựng lại.
3. Mở trang app trên máy tính, tải lại cứng (Ctrl+Shift+R) và xem có lỗi trong Console không.

## 3. Kiểm tra trên iPhone (khoảng 2 phút)

- [ ] Đóng hẳn app (vuốt tắt) rồi mở lại. Nếu vẫn thấy giao diện cũ, đóng và mở thêm một lần.
- [ ] Bấm `+`, nhập số tiền, lưu: bàn phím không che nút Lưu.
- [ ] "📷 Điền từ ảnh": chọn một ảnh chuyển khoản, số tiền, ngày và thu/chi điền đúng. Lần đầu cần mạng để tải bộ đọc (khoảng 6MB).
- [ ] Các tab Tổng quan, Giao dịch, Báo cáo, Cài đặt hiển thị đủ chữ, không tràn.
- [ ] Nút trạng thái ở góc trên chuyển sang **Đã đồng bộ**. Giao dịch vừa thêm hiện ra trên máy còn lại.
- [ ] Mở thử chế độ tối (nếu máy đang dùng chế độ tối).

## 4. Khi sửa `Code.gs` (Google Sheet)

Chỉ cần làm khi file `Code.gs` thay đổi.

1. Mở Google Sheet → Tiện ích mở rộng → **Apps Script**.
2. Thay toàn bộ nội dung bằng `Code.gs` mới.
3. Sửa dòng `const SECRET = '...'` thành đúng mật khẩu đang dùng trong app.
4. **Triển khai → Quản lý triển khai** → biểu tượng bút chì → Phiên bản: **Phiên bản mới** → Triển khai.
5. Giữ cấu hình: Thực thi bằng **Tôi**, Quyền truy cập **Bất kỳ ai**. Địa chỉ `/exec` không đổi nên không phải nhập lại trên điện thoại.
6. Kiểm tra: mở địa chỉ `/exec` trên trình duyệt phải thấy dòng "Chi Tieu API dang chay.", rồi bấm đồng bộ trong app.

## 5. Quay lại bản cũ (rollback)

**App:**
1. Xem lịch sử: `git log --oneline`.
2. `git revert <mã commit lỗi>` rồi `git push origin main`.
3. Tăng số phiên bản trong `sw.js`, đẩy lại, đợi 1–2 phút, đóng mở lại app.

**Google Sheet:** Apps Script → Quản lý triển khai → chọn phiên bản cũ hơn.

**Dữ liệu bị mất hoặc sai:** Cài đặt → Khôi phục từ file sao lưu JSON. Dữ liệu trên Google Sheet cũng giữ bản của từng giao dịch; xóa trong app chỉ là đánh dấu đã xóa.

## 6. Sự cố thường gặp

| Dấu hiệu | Cách xử lý |
|---|---|
| Đẩy lên rồi vẫn thấy bản cũ | Chưa tăng phiên bản trong `sw.js`, hoặc chưa đóng hẳn app. Tăng phiên bản, đẩy lại, đóng mở lại. |
| Nút trạng thái báo **Lỗi · chạm để thử lại** | Chạm vào để xem nguyên nhân ở tab Cài đặt: sai mật khẩu, sai link, hoặc chưa cấp quyền "Bất kỳ ai". |
| "Apps Script không trả dữ liệu hợp lệ" | Triển khai lại Apps Script với quyền "Bất kỳ ai" (mục 4). |
| Đọc ảnh báo lỗi tải | Cần có mạng ở lần đầu để tải bộ đọc. Sau đó dùng được khi offline. |
| Dữ liệu trên máy bị hỏng | App giữ bản sao lỗi ở `qltc.v1.bak`. Khôi phục từ file sao lưu hoặc đồng bộ lại từ Google Sheet. |

## 7. Ghi chú

- Mật khẩu PIN chỉ lưu trên từng máy, không đồng bộ.
- Ảnh bill được đọc ngay trên máy và không gửi đi đâu.
