# Hệ thống Quản lý Đọc truyện

Đồ án Công nghệ Phần mềm Nâng cao, nhóm 3, HUFLIT

## Công nghệ
- Backend: ASP.NET Core Web API (.NET 10), EF Core, SignalR
- Web: React + TypeScript + Vite + Tailwind CSS (cài được như ứng dụng, PWA)
- Mobile: Android (Kotlin, Jetpack Compose, Retrofit)
- CSDL: SQL Server
- Kiểm thử: xUnit (API), Playwright (Web); CI/CD bằng GitHub Actions; chạy gọn bằng Docker Compose
- Nâng cao: Hệ thống xu (PB58: Điểm danh nhận xu, nhiệm vụ đọc truyện, mở khóa chương lẻ, nạp xu)

## Cấu trúc
- `backend/QuanLyDocTruyen.API` : Web API
- `backend/QuanLyDocTruyen.Tests` : kiểm thử tự động cho API (thanh toán, gia hạn, quyền đọc, chữ ký VNPay, xuất Excel…)
- `web/` : giao diện web, kiểm thử giao diện trong `web/e2e`
- `mobile/` : ứng dụng Android
- `database/` : script SQL
- `docs/` : tài liệu phân tích thiết kế, Product Backlog, [tài liệu API](docs/API.md)

## Chạy trên máy

1. API (tự tạo CSDL và dữ liệu mẫu khi chạy lần đầu):
   ```
   cd backend/QuanLyDocTruyen.API
   dotnet run
   ```
   Tài liệu API gọi thử được: http://localhost:5086/scalar
2. Web:
   ```
   cd web
   npm install
   npm run dev
   ```
   Mở http://localhost:5173
3. Android: mở thư mục `mobile` bằng Android Studio rồi bấm Run (máy ảo gọi API qua `10.0.2.2:5086`).

Tài khoản mẫu: `admin` / `Admin@123` (quản trị), `vip`, `minh`, `khach` / `123456` (độc giả).

## Chạy bằng Docker

```
docker compose up --build
```
Web: http://localhost:8080, API: http://localhost:5086, SQL Server: `localhost,14333` (tài khoản `sa`).

## Kiểm thử

```
dotnet test QuanLyDocTruyen.slnx
cd web && npx playwright install chromium && npm run test:e2e
```
Mỗi lần push lên `develop` hoặc `main`, GitHub Actions tự build API, Web, APK Android và chạy toàn bộ kiểm thử (`.github/workflows/ci.yml`).
