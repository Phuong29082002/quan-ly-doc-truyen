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
    Task<UserDto> UploadAvatarAsync(int userId, IFormFile file);
    Task ChangePasswordAsync(int userId, ChangePasswordRequest req);
}

public class AuthService(
    AppDbContext db,
    IPasswordHasher<User> hasher,
    IOptions<JwtOptions> options,
    IWebHostEnvironment env) : IAuthService
{
    private static readonly string[] AllowedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private const long MaxAvatarSize = 2 * 1024 * 1024; // 2MB

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

    // PB04: cập nhật tên hiển thị
    public async Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileRequest req)
    {
        var user = await db.Users.FindAsync(userId)
            ?? throw new NotFoundException("Không tìm thấy tài khoản");

        user.DisplayName = req.DisplayName.Trim();
        await db.SaveChangesAsync();
        return ToDto(user);
    }

    // PB04: ảnh đại diện (multipart/form-data, field "file")
    public async Task<UserDto> UploadAvatarAsync(int userId, IFormFile file)
    {
        var user = await db.Users.FindAsync(userId)
            ?? throw new NotFoundException("Không tìm thấy tài khoản");

        if (file is null || file.Length == 0)
            throw new BadRequestException("Vui lòng chọn ảnh đại diện");
        if (file.Length > MaxAvatarSize)
            throw new BadRequestException("Ảnh đại diện tối đa 2MB");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(ext))
            throw new BadRequestException("Chỉ chấp nhận ảnh .jpg, .jpeg, .png, .webp");

        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var folder = Path.Combine(webRoot, "uploads", "avatars");
        Directory.CreateDirectory(folder);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        await using (var stream = System.IO.File.Create(Path.Combine(folder, fileName)))
        {
            await file.CopyToAsync(stream);
        }

        // Xóa ảnh cũ nếu có
        if (user.AvatarUrl is not null && user.AvatarUrl.StartsWith("/uploads/avatars/"))
        {
            var oldPath = Path.Combine(folder, Path.GetFileName(user.AvatarUrl));
            if (System.IO.File.Exists(oldPath))
                System.IO.File.Delete(oldPath);
        }

        user.AvatarUrl = $"/uploads/avatars/{fileName}";
        await db.SaveChangesAsync();
        return ToDto(user);
    }

    // PB04: đổi mật khẩu, bắt buộc nhập đúng mật khẩu cũ.
    // Sai mật khẩu cũ trả 400 (không phải 401) vì client tự đăng xuất khi nhận 401.
    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest req)
    {
        var user = await db.Users.FindAsync(userId)
            ?? throw new NotFoundException("Không tìm thấy tài khoản");

        if (hasher.VerifyHashedPassword(user, user.PasswordHash, req.CurrentPassword) == PasswordVerificationResult.Failed)
            throw new BadRequestException("Mật khẩu hiện tại không đúng");

        if (req.NewPassword == req.CurrentPassword)
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