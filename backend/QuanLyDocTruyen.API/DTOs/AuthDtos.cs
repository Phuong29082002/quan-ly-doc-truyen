using System.ComponentModel.DataAnnotations;

namespace QuanLyDocTruyen.API.DTOs;

public class RegisterRequest
{
    [Required(ErrorMessage = "Vui lòng nhập tên đăng nhập")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Tên đăng nhập từ 3 đến 50 ký tự")]
    [RegularExpression(@"^[a-zA-Z0-9_.]+$", ErrorMessage = "Tên đăng nhập chỉ gồm chữ không dấu, số, dấu _ và .")]
    public string Username { get; set; } = "";

    [Required(ErrorMessage = "Vui lòng nhập email")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ")]
    public string Email { get; set; } = "";

    [Required(ErrorMessage = "Vui lòng nhập mật khẩu")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự")]
    public string Password { get; set; } = "";

    [StringLength(100)]
    public string? DisplayName { get; set; }
}

public class LoginRequest
{
    [Required(ErrorMessage = "Vui lòng nhập tên đăng nhập hoặc email")]
    public string Login { get; set; } = "";

    [Required(ErrorMessage = "Vui lòng nhập mật khẩu")]
    public string Password { get; set; } = "";
}

public record UserDto(int Id, string Username, string Email, string DisplayName, string Role, string? AvatarUrl);

public record AuthResponse(string Token, DateTime ExpiresAt, UserDto User);

// PB04: hồ sơ và đổi mật khẩu
public class UpdateProfileRequest
{
    [Required(ErrorMessage = "Vui lòng nhập tên hiển thị")]
    [StringLength(100, ErrorMessage = "Tên hiển thị tối đa 100 ký tự")]
    public string DisplayName { get; set; } = "";
}

public class ChangePasswordRequest
{
    [Required(ErrorMessage = "Vui lòng nhập mật khẩu hiện tại")]
    public string CurrentPassword { get; set; } = "";

    [Required(ErrorMessage = "Vui lòng nhập mật khẩu mới")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Mật khẩu mới tối thiểu 6 ký tự")]
    public string NewPassword { get; set; } = "";
}
