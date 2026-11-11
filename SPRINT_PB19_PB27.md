# PB19–PB27: Thanh toán, quyền đọc và tiến độ đọc

## Backend API

- `POST /api/payments/checkout`: thanh toán gói đọc hoặc mua riêng truyện. Body: `{ "type": "Package", "itemId": 1, "simulateSuccess": true }` hoặc `type: "Story"`.
- `GET /api/payments/history`: lịch sử giao dịch, truyện đã mua và các gói đã đăng ký của tài khoản hiện tại.
- `GET /api/payments/reconciliation`: Admin xem giao dịch Success chưa có bản ghi cấp quyền.
- `POST /api/payments/reconciliation/{transactionId}`: Admin cấp lại quyền từ giao dịch Success; thao tác có tính idempotent.
- `GET /api/reading-progress`: danh sách truyện đang đọc, mới đọc gần nhất đứng đầu.
- `GET /api/reading-progress/{storyId}`: tiến độ của một truyện.
- `PUT /api/reading-progress`: lưu `{ "storyId": 1, "chapterId": 1, "position": 0 }`.

## Quy tắc cấp quyền

- Giao dịch Failed được lưu nhưng không tạo `UserPackage` hoặc `StoryPurchase`.
- Giao dịch Success tạo quyền đọc trong cùng transaction DB.
- Gia hạn lấy thời điểm kết thúc lớn nhất còn hiệu lực của người dùng làm mốc cộng thêm thời hạn gói.
- Mỗi `TransactionId` chỉ cấp quyền một lần; đối soát không tạo bản ghi trùng.
- Quyền mua riêng không phụ thuộc thời hạn gói.
- Chưa thêm cột/bảng mới; sử dụng các Entity và bảng hiện có, vì vậy không cần migration cho phần thay đổi này.

## Web

- `/goi-doc`: đăng ký và thanh toán gói đọc giả lập.
- Trang chi tiết truyện: mua quyền đọc riêng vĩnh viễn.
- `/tai-khoan/thanh-toan`: lịch sử giao dịch, gói và truyện đã mua.
- `/dang-doc`: danh sách truyện đang đọc, sắp xếp theo lần đọc gần nhất và nút đọc tiếp.
- `/admin/doi-soat`: danh sách giao dịch lệch và thao tác cấp lại quyền.

## Mobile

- Retrofit bổ sung API thanh toán, lịch sử thanh toán và tiến độ đọc.
- Màn hình chi tiết truyện có thao tác mua truyện và đăng ký gói.
- Màn hình đọc lưu chương hiện tại để đồng bộ với Web.

## Lưu ý cổng thanh toán giả lập

`simulateSuccess` chỉ phục vụ demo/test luồng thành công và thất bại. Không dùng cơ chế client tự gửi kết quả thành công trong môi trường production; khi tích hợp cổng thật, Backend phải xác minh chữ ký/callback từ nhà cung cấp thanh toán rồi mới chuyển trạng thái giao dịch sang Success.

## Kiểm tra

- Đã chạy `npx tsc -b --pretty false` và TypeScript không báo lỗi.
- Chưa thể chạy build .NET hoặc Android trong môi trường đóng gói này vì không có .NET SDK/Android SDK.
- Lệnh chạy Backend tại máy phát triển: `dotnet build backend/QuanLyDocTruyen.API/QuanLyDocTruyen.API.csproj`.


## Cập nhật chuyển đổi gói đọc

Sau khi lấy bản cập nhật này, chạy migration từ thư mục backend:

```powershell
dotnet ef database update --project QuanLyDocTruyen.API.csproj
```

Migration `20261111090000_AddPackageSwitching` bổ sung `IsPaused`, `RemainingDays` cho `UserPackages` và `PackageMode` cho `Transactions`. Khi chuyển gói, gói đang dùng được tạm dừng và lưu số ngày còn lại; khi chọn lại gói đã tạm dừng, hệ thống khôi phục số ngày đã bảo lưu. Gia hạn gói đang dùng cộng thời hạn vào ngày hết hạn hiện tại.
