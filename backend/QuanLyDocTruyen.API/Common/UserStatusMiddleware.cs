using Microsoft.Extensions.Caching.Memory;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.Entities;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Common;

/// <summary>
/// PB34: tài khoản bị tạm ngừng thì token cũ cũng không dùng được nữa (trả 403),
/// không phải chờ token hết hạn. Tài khoản bị hạn chế vẫn đọc được nhưng không bình luận / báo cáo.
/// </summary>
public class UserStatusMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, AppDbContext db, IMemoryCache cache)
    {
        if (context.User.Identity?.IsAuthenticated == true && context.User.GetUserId() is int userId)
        {
            var status = await UserStatusCache.GetAsync(cache, db, userId);
            if (status == UserStatus.Suspended)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new
                {
                    type = "https://tools.ietf.org/html/rfc9110#section-15.5.4",
                    title = "Tài khoản đã bị tạm ngừng",
                    status = 403,
                    code = "AccountSuspended"
                });
                return;
            }
        }
        await next(context);
    }
}
