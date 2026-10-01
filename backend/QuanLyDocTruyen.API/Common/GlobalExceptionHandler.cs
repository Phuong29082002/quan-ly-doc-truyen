using Microsoft.AspNetCore.Diagnostics;

namespace QuanLyDocTruyen.API.Common;

public class GlobalExceptionHandler(
    IProblemDetailsService problemDetails,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception ex, CancellationToken ct)
    {
        var (status, title) = ex switch
        {
            AppException app => (app.StatusCode, app.Message),
            _ => (500, "Lỗi hệ thống, vui lòng thử lại sau")
        };

        if (status == 500)
            logger.LogError(ex, "Lỗi chưa xử lý");

        context.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = { Status = status, Title = title },
            Exception = ex
        });
    }
}