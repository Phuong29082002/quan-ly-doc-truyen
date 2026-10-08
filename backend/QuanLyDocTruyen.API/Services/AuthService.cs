using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest req);
    Task<AuthResponse> LoginAsync(LoginRequest req);
    Task<UserDto> GetMeAsync(int userId);
}

public class AuthService(
    AppDbContext db,
    IPasswordHasher<User> hasher,
    IOptions<JwtOptions> options) : IAuthService
{
    private readonly JwtOptions _jwt = options.Value;

    public async Task<AuthResponse> RegisterAsync(RegisterRequest req)
    {
        var username = req.Username.Trim();
        var email = req.Email.Trim().ToLowerInvariant();

        if (await db.Users.AnyAsync(u => u.Username == username))
            throw new ConflictException("Tên đăng nhập đã tồn tại");
        if (await db.Users.AnyAsync(u => u.Email == email))
            throw new ConflictException("Email đã được sử dụng");

        var user = new User
        {
            Username = username,
            Email = email,
            DisplayName = string.IsNullOrWhiteSpace(req.DisplayName) ? username : req.DisplayName.Trim()
        };
        user.PasswordHash = hasher.HashPassword(user, req.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return CreateAuthResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest req)
    {
        var login = req.Login.Trim();
        var loginEmail = login.ToLowerInvariant();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == login || u.Email == loginEmail);

        if (user is null ||
            hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password) == PasswordVerificationResult.Failed)
            throw new UnauthorizedException("Sai tên đăng nhập hoặc mật khẩu");

        if (user.Status == UserStatus.Suspended)
            throw new ForbiddenException("Tài khoản đã bị tạm ngừng");

        return CreateAuthResponse(user);
    }

    public async Task<UserDto> GetMeAsync(int userId)
    {
        var user = await db.Users.FindAsync(userId)
            ?? throw new NotFoundException("Không tìm thấy tài khoản");
        return ToDto(user);
    }

    private AuthResponse CreateAuthResponse(User user)
    {
        var expires = DateTime.UtcNow.AddMinutes(_jwt.ExpireMinutes);

        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = _jwt.Issuer,
            Audience = _jwt.Audience,
            Expires = expires,
            Subject = new ClaimsIdentity(
            [
                new Claim("sub", user.Id.ToString()),
                new Claim("name", user.Username),
                new Claim("email", user.Email),
                new Claim("role", user.Role.ToString())
            ]),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key)),
                SecurityAlgorithms.HmacSha256)
        });

        return new AuthResponse(token, expires, ToDto(user));
    }

    private static UserDto ToDto(User u) =>
        new(u.Id, u.Username, u.Email, u.DisplayName, u.Role.ToString());
}