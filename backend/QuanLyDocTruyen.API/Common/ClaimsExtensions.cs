using System.Security.Claims;

namespace QuanLyDocTruyen.API.Common;

public static class ClaimsExtensions
{
    /// <summary>Lấy Id người dùng từ token; trả về null nếu chưa đăng nhập</summary>
    public static int? GetUserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirst("sub")?.Value, out var id) ? id : null;
}
