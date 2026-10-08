namespace QuanLyDocTruyen.API.Common;

public class AppException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;

    /// <summary>Dữ liệu bổ sung trả về trong ProblemDetails (ví dụ code, price) để client xử lý</summary>
    public Dictionary<string, object?> Extensions { get; } = new();
}

public class BadRequestException(string message) : AppException(400, message);
public class UnauthorizedException(string message) : AppException(401, message);
public class ForbiddenException(string message) : AppException(403, message);
public class NotFoundException(string message) : AppException(404, message);
public class ConflictException(string message) : AppException(409, message);
