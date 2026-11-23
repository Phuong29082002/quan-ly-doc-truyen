using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace QuanLyDocTruyen.API.Data;

/// <summary>
/// Design-time factory cho EF Core tools (dotnet ef migrations add/remove).
/// Giúp EF tools tạo DbContext mà không cần chạy toàn bộ Program.cs (tránh lỗi kết nối DB lúc design-time).
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        // Ưu tiên biến môi trường (khi chạy trong Docker), fallback về localhost
        var connStr = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
            ?? "Server=localhost;Database=QuanLyDocTruyen;Trusted_Connection=True;TrustServerCertificate=True";

        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(connStr)
            .Options;

        return new AppDbContext(opts);
    }
}
