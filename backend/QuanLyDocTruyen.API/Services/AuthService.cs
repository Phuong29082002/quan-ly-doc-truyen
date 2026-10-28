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
    Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileRequest req);
    Task<UserDto> UpdateAvatarAsync(int userId, IFormFile? file);
    Task<UserAvatar?> GetAvatarAsync(int userId);
    Task ChangePasswordAsync(int userId, ChangePasswordRequest req);
}

public class AuthService(
    AppDbContext db,
    IPasswordHasher<User> hasher,
    IOptions<JwtOptions> options) : IAuthService
{
    private readonly JwtOptions _jwt = options.Value;
    private static readonly HashSet<string> AllowedAvatarTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

    // PB04: đổi tên hiển thị
    public async Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileRequest req)
    {
        var user = await db.Users.FindAsync(userId) ?? throw new NotFoundException("Không tìm thấy tài khoản");
        user.DisplayName = req.DisplayName.Trim();
        await db.SaveChangesAsync();
        return ToDto(user);
    }

    public async Task<UserDto> UpdateAvatarAsync(int userId, IFormFile? file)
    {
        var user = await db.Users.FindAsync(userId) ?? throw new NotFoundException("Không tìm thấy tài khoản");
        if (file is null || file.Length == 0)
            throw new BadRequestException("Vui lòng chọn ảnh");
        if (file.Length > 2 * 1024 * 1024)
            throw new BadRequestException("Ảnh tối đa 2MB");
        if (!AllowedAvatarTypes.Contains(file.ContentType.ToLowerInvariant()))
            throw new BadRequestException("Chỉ hỗ trợ JPG, PNG, WEBP hoặc GIF");

        await using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        var imageData = stream.ToArray();

        var avatar = await db.UserAvatars.FindAsync(userId);
        if (avatar is null)
        {
            avatar = new UserAvatar { UserId = userId, User = user };
            db.UserAvatars.Add(avatar);
        }
        avatar.ImageData = imageData;
        avatar.ContentType = file.ContentType.ToLowerInvariant();
        user.AvatarUrl = $"/api/auth/users/{userId}/avatar";
        await db.SaveChangesAsync();
        return ToDto(user);
    }

    public Task<UserAvatar?> GetAvatarAsync(int userId) =>
        db.UserAvatars.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId);

    // PB04: đổi mật khẩu (phải nhập đúng mật khẩu cũ)
    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest req)
    {
        var user = await db.Users.FindAsync(userId) ?? throw new NotFoundException("Không tìm thấy tài khoản");

        if (hasher.VerifyHashedPassword(user, user.PasswordHash, req.CurrentPassword) == PasswordVerificationResult.Failed)
            throw new BadRequestException("Mật khẩu hiện tại không đúng");
        if (req.CurrentPassword == req.NewPassword)
            throw new BadRequestException("Mật khẩu mới phải khác mật khẩu hiện tại");

        user.PasswordHash = hasher.HashPassword(user, req.NewPassword);
        await db.SaveChangesAsync();
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
        new(u.Id, u.Username, u.Email, u.DisplayName, u.Role.ToString(), u.AvatarUrl);
}
