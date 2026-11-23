using System.Security.Claims;
using System.Text;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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
    // PB57: Google login
    Task<AuthResponse> GoogleLoginAsync(string idToken);
    // Quên mật khẩu
    Task ForgotPasswordAsync(string email);
    Task ResetPasswordAsync(ResetPasswordRequest req);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _hasher;
    private readonly JwtOptions _jwt;
    private readonly IMemoryCache _cache;
    private readonly IEmailService _emailService;
    private readonly string _googleClientId;
    private static readonly HashSet<string> AllowedAvatarTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    public AuthService(
        AppDbContext db,
        IPasswordHasher<User> hasher,
        IOptions<JwtOptions> jwtOptions,
        IMemoryCache cache,
        IEmailService emailService,
        IConfiguration configuration)
    {
        _db = db;
        _hasher = hasher;
        _jwt = jwtOptions.Value;
        _cache = cache;
        _emailService = emailService;
        _googleClientId = configuration["Google:ClientId"] ?? "";
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest req)
    {
        var username = req.Username.Trim();
        var email = req.Email.Trim().ToLowerInvariant();

        if (await _db.Users.AnyAsync(u => u.Username == username))
            throw new ConflictException("Tên đăng nhập đã tồn tại");
        if (await _db.Users.AnyAsync(u => u.Email == email))
            throw new ConflictException("Email đã được sử dụng");

        var user = new User
        {
            Username = username,
            Email = email,
            DisplayName = string.IsNullOrWhiteSpace(req.DisplayName) ? username : req.DisplayName.Trim()
        };
        user.PasswordHash = _hasher.HashPassword(user, req.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return CreateAuthResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest req)
    {
        var login = req.Login.Trim();
        var loginEmail = login.ToLowerInvariant();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == login || u.Email == loginEmail);

        if (user is null ||
            _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password) == PasswordVerificationResult.Failed)
            throw new UnauthorizedException("Sai tên đăng nhập hoặc mật khẩu");

        if (user.Status == UserStatus.Suspended)
            throw new ForbiddenException("Tài khoản đã bị tạm ngừng" + (string.IsNullOrWhiteSpace(user.StatusReason) ? "" : $". Lý do: {user.StatusReason}"));

        return CreateAuthResponse(user);
    }

    public async Task<UserDto> GetMeAsync(int userId)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new NotFoundException("Không tìm thấy tài khoản");
        return ToDto(user);
    }

    // PB04: đổi tên hiển thị
    public async Task<UserDto> UpdateProfileAsync(int userId, UpdateProfileRequest req)
    {
        var user = await _db.Users.FindAsync(userId) ?? throw new NotFoundException("Không tìm thấy tài khoản");
        user.DisplayName = req.DisplayName.Trim();
        await _db.SaveChangesAsync();
        return ToDto(user);
    }

    public async Task<UserDto> UpdateAvatarAsync(int userId, IFormFile? file)
    {
        var user = await _db.Users.FindAsync(userId) ?? throw new NotFoundException("Không tìm thấy tài khoản");
        if (file is null || file.Length == 0)
            throw new BadRequestException("Vui lòng chọn ảnh");
        if (file.Length > 2 * 1024 * 1024)
            throw new BadRequestException("Ảnh tối đa 2MB");
        if (!AllowedAvatarTypes.Contains(file.ContentType.ToLowerInvariant()))
            throw new BadRequestException("Chỉ hỗ trợ JPG, PNG, WEBP hoặc GIF");

        await using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        var imageData = stream.ToArray();

        var avatar = await _db.UserAvatars.FindAsync(userId);
        if (avatar is null)
        {
            avatar = new UserAvatar { UserId = userId, User = user };
            _db.UserAvatars.Add(avatar);
        }
        avatar.ImageData = imageData;
        avatar.ContentType = file.ContentType.ToLowerInvariant();
        user.AvatarUrl = $"/api/auth/users/{userId}/avatar";
        await _db.SaveChangesAsync();
        return ToDto(user);
    }

    public Task<UserAvatar?> GetAvatarAsync(int userId) =>
        _db.UserAvatars.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId);

    // PB04: đổi mật khẩu (phải nhập đúng mật khẩu cũ)
    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest req)
    {
        var user = await _db.Users.FindAsync(userId) ?? throw new NotFoundException("Không tìm thấy tài khoản");

        if (_hasher.VerifyHashedPassword(user, user.PasswordHash, req.CurrentPassword) == PasswordVerificationResult.Failed)
            throw new BadRequestException("Mật khẩu hiện tại không đúng");
        if (req.CurrentPassword == req.NewPassword)
            throw new BadRequestException("Mật khẩu mới phải khác mật khẩu hiện tại");

        user.PasswordHash = _hasher.HashPassword(user, req.NewPassword);
        await _db.SaveChangesAsync();
    }

    // PB57: Google Login
    public async Task<AuthResponse> GoogleLoginAsync(string idToken)
    {
        // 1. Xác thực idToken với Google
        var settings = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = new[] { _googleClientId }
        };

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
        }
        catch
        {
            throw new UnauthorizedException("Token Google không hợp lệ");
        }

        var email = payload.Email.ToLowerInvariant();
        var googleId = payload.Subject;

        // 2. Tìm user theo GoogleId hoặc Email
        var user = await _db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId || u.Email == email);

        if (user is null)
        {
            // Tạo user mới từ tài khoản Google
            user = new User
            {
                Username = email.Split('@')[0] + "_" + Guid.NewGuid().ToString("N")[..6],
                Email = email,
                DisplayName = payload.Name ?? email,
                GoogleId = googleId,
                EmailConfirmed = true,
                PasswordHash = ""
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }
        else
        {
            // Liên kết tài khoản hiện có với Google nếu chưa liên kết
            if (string.IsNullOrEmpty(user.GoogleId))
            {
                user.GoogleId = googleId;
                user.EmailConfirmed = true;
                await _db.SaveChangesAsync();
            }

            if (user.Status == UserStatus.Suspended)
                throw new ForbiddenException("Tài khoản đã bị tạm ngừng");
        }

        return CreateAuthResponse(user);
    }

    // Quên mật khẩu: gửi OTP qua email
    public async Task ForgotPasswordAsync(string email)
    {
        email = email.Trim().ToLowerInvariant();

        // Tìm user - không tiết lộ email có tồn tại hay không (bảo mật)
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null) return;

        // Tạo OTP 6 chữ số
        var otp = Random.Shared.Next(100000, 999999).ToString();

        // Lưu vào MemoryCache với TTL 10 phút
        var cacheKey = $"otp:{email}";
        _cache.Set(cacheKey, otp, TimeSpan.FromMinutes(10));

        // Gửi email chứa OTP
        await _emailService.SendOtpAsync(email, otp);
    }

    // Đặt lại mật khẩu bằng OTP
    public async Task ResetPasswordAsync(ResetPasswordRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var cacheKey = $"otp:{email}";

        // Kiểm tra OTP
        if (!_cache.TryGetValue(cacheKey, out string? savedOtp) || savedOtp != req.Otp)
            throw new BadRequestException("Mã OTP không đúng hoặc đã hết hạn");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email)
            ?? throw new NotFoundException("Không tìm thấy tài khoản");

        // Cập nhật mật khẩu mới
        user.PasswordHash = _hasher.HashPassword(user, req.NewPassword);
        await _db.SaveChangesAsync();

        // Xóa OTP sau khi sử dụng thành công
        _cache.Remove(cacheKey);
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
        new(u.Id, u.Username, u.Email, u.DisplayName, u.Role.ToString(), u.AvatarUrl, u.Status.ToString(), u.StatusReason);
}
