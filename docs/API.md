# Tài liệu API

Web API dùng chung cho Web (React) và Android. Địa chỉ mặc định khi chạy trên máy: `http://localhost:5086`.

- Xem và gọi thử trực tiếp: mở `http://localhost:5086/scalar` khi chạy ở môi trường Development (tài liệu OpenAPI sinh tự động tại `/openapi/v1.json`).
- Xác thực: gửi header `Authorization: Bearer <token>` lấy từ `POST /api/auth/login`.
- Lỗi trả theo chuẩn ProblemDetails: `title` là câu thông báo, `status` là mã lỗi (400, 401, 403, 404, 409). Chương trả phí bị chặn trả 403 kèm `code` = `LoginRequired` hoặc `PurchaseRequired`, tài khoản bị tạm ngừng trả 403 kèm `code` = `AccountSuspended`.
- Thông báo thời gian thực: kết nối SignalR tới `/hubs/notifications` (token gửi qua query `access_token`), sự kiện `notification`.

## AdminTransactions

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/admin/transactions` | Admin | PB24: danh sách giao dịch, lọc trạng thái, giao dịch thiếu quyền đọc |
| POST | `/api/admin/transactions/{id}/confirm` | Admin | Chuyển khoản QR: Admin thấy tiền về tài khoản thì xác nhận (received = true) hoặc hủy (false) |
| POST | `/api/admin/transactions/{id}/grant` | Admin | PB24: cấp lại quyền đọc cho giao dịch thành công |

## Auth

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/auth/register` | Không | PB01: đăng ký thành viên |
| POST | `/api/auth/login` | Không | PB02: đăng nhập, trả JWT |
| GET | `/api/auth/me` | Đăng nhập | Thông tin tài khoản đang đăng nhập |
| PUT | `/api/auth/me` | Đăng nhập | PB04: cập nhật hồ sơ |
| POST | `/api/auth/me/avatar` | Đăng nhập | PB04: tải ảnh đại diện (multipart, field file) |
| GET | `/api/auth/users/{userId}/avatar` | Không | Ảnh đại diện lưu trong CSDL |
| POST | `/api/auth/change-password` | Đăng nhập | PB04: đổi mật khẩu |

## Chapters

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/chapters/{id}` | Admin | PB09: lấy chương để sửa |
| PUT | `/api/chapters/{id}` | Admin | PB09, PB10: sửa chương, hẹn giờ phát hành |
| DELETE | `/api/chapters/{id}` | Admin | PB09: xóa chương |
| POST | `/api/chapters/images` | Admin | Trả về đường dẫn để chèn vào nội dung chương theo cú pháp ![mô tả](đường dẫn) |

## Coins (PB58)

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/coins/balance` | Đăng nhập | Lấy số dư xu, trạng thái điểm danh hôm nay và chuỗi điểm danh liên tục |
| POST | `/api/coins/check-in` | Đăng nhập | Điểm danh nhận xu hằng ngày (+10 xu các ngày thường, +30 xu mốc 7 ngày) |
| GET | `/api/coins/missions` | Đăng nhập | Danh sách nhiệm vụ đọc truyện hôm nay và tiến độ thực tế |
| POST | `/api/coins/missions/{key}/claim` | Đăng nhập | Nhận thưởng xu sau khi hoàn thành nhiệm vụ |
| POST | `/api/coins/unlock-chapter` | Đăng nhập | Mở khóa lẻ 1 chương trả phí bằng 5 xu (đọc vĩnh viễn) |
| GET | `/api/coins/history` | Đăng nhập | Lịch sử cộng/trừ xu của tài khoản |
| GET | `/api/coins/packages` | Không | Danh sách các gói nạp xu ưu đãi |
| POST | `/api/coins/top-up` | Đăng nhập | Tạo giao dịch nạp xu qua cổng thanh toán (Mock, VNPay, VietQR) |

## Community

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/stories/{storyId}/follow` | Không | PB28: trạng thái theo dõi và số người theo dõi |
| POST | `/api/stories/{storyId}/follow` | Đăng nhập | PB28: theo dõi truyện |
| DELETE | `/api/stories/{storyId}/follow` | Đăng nhập | PB28: bỏ theo dõi |
| GET | `/api/me/follows` | Đăng nhập | PB28: truyện đang theo dõi |
| GET | `/api/me/notifications` | Đăng nhập | PB29: danh sách thông báo |
| GET | `/api/me/notifications/unread-count` | Đăng nhập | PB29: số thông báo chưa đọc |
| POST | `/api/me/notifications/{id}/read` | Đăng nhập | PB29: đánh dấu đã đọc |
| POST | `/api/me/notifications/read-all` | Đăng nhập | PB29: đánh dấu tất cả đã đọc |
| GET | `/api/chapters/{chapterId}/comments` | Không | PB30: bình luận của chương (kèm trả lời) |
| POST | `/api/chapters/{chapterId}/comments` | Đăng nhập | PB30: đăng bình luận hoặc trả lời (parentId) |
| DELETE | `/api/comments/{id}` | Đăng nhập | Xóa bình luận của mình (Admin xóa được mọi bình luận) |
| POST | `/api/comments/{id}/report` | Đăng nhập | PB31: báo cáo vi phạm |
| GET | `/api/admin/reports` | Admin | PB32: danh sách báo cáo |
| POST | `/api/admin/reports/{id}/resolve` | Admin | PB32: xử lý báo cáo (Hide, Delete, Reject) |
| GET | `/api/admin/comments` | Admin | PB32: tìm bình luận |
| PATCH | `/api/admin/comments/{id}/hidden` | Admin | PB32: ẩn hoặc hiện bình luận |
| GET | `/api/admin/users` | Admin | PB33: danh sách thành viên, lọc trạng thái |
| GET | `/api/admin/users/{id}` | Admin | PB33: chi tiết sử dụng dịch vụ của thành viên |
| PATCH | `/api/admin/users/{id}/status` | Admin | PB34: hạn chế, tạm ngừng, mở lại tài khoản |

## Discovery

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/stories/{storyId}/rating` | Không | PB49: điểm trung bình, phân bố sao, điểm của tôi |
| PUT | `/api/stories/{storyId}/rating` | Đăng nhập | PB49: chấm hoặc sửa điểm (1-5) |
| DELETE | `/api/stories/{storyId}/rating` | Đăng nhập | PB49: bỏ đánh giá |
| GET | `/api/rankings` | Không | PB49: xếp hạng (type = views, rating, follows; period = day, week, month, all) |
| GET | `/api/recommendations` | Không | Có đăng nhập: gợi ý theo sở thích; chưa đăng nhập: truyện được đọc nhiều |
| GET | `/api/stories/{storyId}/similar` | Không | PB50: truyện tương tự |
| POST | `/api/chatbot` | Không | PB61: chatbot gợi ý truyện, body `{ "message": "truyện trinh thám hay" }`, trả câu trả lời, danh sách truyện và câu hỏi gợi ý |
| GET | `/api/admin/stats` | Admin | PB35-PB37: thống kê theo khoảng ngày (from, to) |
| GET | `/api/admin/stats/export` | Admin | PB54: tải báo cáo Excel (.xlsx) |

## Genres

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/genres` | Không | PB05: danh sách thể loại |
| POST | `/api/genres` | Admin | PB05: thêm thể loại |
| PUT | `/api/genres/{id}` | Admin | PB05: sửa thể loại |
| DELETE | `/api/genres/{id}` | Admin | PB05: xóa thể loại (không xóa thể loại đang dùng) |

## Health

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/health` | Không | Kiểm tra API đang chạy |
| GET | `/api/health/error` | Không | Thử định dạng lỗi chung |

## Me

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/me/transactions` | Đăng nhập | PB25: lịch sử thanh toán |
| GET | `/api/me/library` | Đăng nhập | PB25: gói đang dùng, hạn gói, truyện đã mua |
| GET | `/api/me/reading` | Đăng nhập | PB27: truyện đang đọc |
| GET | `/api/me/reading/{storyId}` | Đăng nhập | PB26: tiến độ đọc của một truyện (204 nếu chưa đọc) |
| PUT | `/api/me/reading` | Đăng nhập | PB26: lưu vị trí đọc (đồng bộ Web và Mobile) |
| DELETE | `/api/me/reading/{storyId}` | Đăng nhập | PB27: bỏ truyện khỏi danh sách đang đọc |

## Packages

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/packages` | Không | Danh sách gói đang bán |
| GET | `/api/packages/admin` | Admin | Tất cả gói, kể cả đã ngừng cung cấp |
| GET | `/api/packages/{id}` | Admin | PB18: chi tiết gói |
| POST | `/api/packages` | Admin | PB18: tạo gói đọc |
| PUT | `/api/packages/{id}` | Admin | PB18: sửa gói, ngừng cung cấp |

## Payments

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/payments/providers` | Không | Các cổng thanh toán đang bật |
| POST | `/api/payments/package` | Đăng nhập | Đăng ký hoặc gia hạn gói đọc |
| POST | `/api/payments/package/{packageId}/restore` | Đăng nhập | Khôi phục gói đã bảo lưu khi chuyển gói (miễn phí) |
| POST | `/api/payments/story` | Đăng nhập | Mua quyền đọc riêng một truyện |
| POST | `/api/payments/{id}/mock-result` | Đăng nhập | Cổng giả lập: chốt kết quả thanh toán thành công / thất bại |
| GET | `/api/payments/{id}` | Đăng nhập | Trạng thái một giao dịch của tôi |
| GET | `/api/payments/{id}/bank-qr` | Đăng nhập | Chuyển khoản QR: thông tin tài khoản + ảnh mã VietQR (số tiền, nội dung điền sẵn) |
| POST | `/api/payments/sepay/webhook` | Không | SePay báo có tiền vào tài khoản (header Authorization: Apikey ...) |
| GET | `/api/payments/vnpay/return` | Không | chuyển sang trang kết quả trên Web; trên điện thoại thì hiện trang báo kết quả để quay lại app. |
| GET | `/api/payments/vnpay/ipn` | Không | VNPay gọi ngầm (IPN) để báo kết quả, kể cả khi người dùng đóng trình duyệt |

## Stories

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/stories` | Không | PB11, PB12: tìm kiếm, lọc, sắp xếp |
| GET | `/api/stories/suggest` | Không | PB51: gợi ý tức thì (không dấu) |
| GET | `/api/stories/{id}` | Không | PB13: chi tiết truyện. Admin thấy cả chương hẹn giờ chưa phát hành |
| POST | `/api/stories` | Admin | PB06 |
| PUT | `/api/stories/{id}` | Admin | PB06, PB07 |
| POST | `/api/stories/{id}/cover` | Admin | PB06: ảnh bìa (multipart/form-data, field "file") |
| GET | `/api/stories/{storyId}/chapters/{number}` | Không | PB14: đọc chương |
| POST | `/api/stories/{storyId}/chapters` | Admin | PB08: thêm chương |
