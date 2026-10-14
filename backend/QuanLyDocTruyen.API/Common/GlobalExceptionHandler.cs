using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

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

        var problem = new ProblemDetails { Status = status, Title = title };
        if (ex is AppException { Extensions.Count: > 0 } appEx)
        {
            foreach (var (key, value) in appEx.Extensions)
                problem.Extensions[key] = value;
        }

        context.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = problem,
            Exception = ex
        });
    }
}