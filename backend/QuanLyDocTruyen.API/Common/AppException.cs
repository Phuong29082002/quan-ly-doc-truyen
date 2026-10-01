namespace QuanLyDocTruyen.API.Common;

public class AppException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public class BadRequestException(string message) : AppException(400, message);
public class UnauthorizedException(string message) : AppException(401, message);
public class ForbiddenException(string message) : AppException(403, message);
public class NotFoundException(string message) : AppException(404, message);