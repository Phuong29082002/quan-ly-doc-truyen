namespace QuanLyDocTruyen.API.Entities;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string? AvatarUrl { get; set; }
    public UserAvatar? Avatar { get; set; }
    public UserRole Role { get; set; } = UserRole.Member;
    public UserStatus Status { get; set; } = UserStatus.Active;
    /// <summary>PB34: lý do hạn chế / tạm ngừng tài khoản</summary>
    public string? StatusReason { get; set; }
    public DateTime? StatusChangedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>PB58: số dư xu hiện tại (mặc định tặng 50 xu chào mừng)</summary>
    public int Coins { get; set; } = 50;

    /// <summary>PB58: ngày điểm danh gần nhất (giờ UTC)</summary>
    public DateTime? LastCheckInAt { get; set; }

    /// <summary>PB58: chuỗi ngày điểm danh liên tục</summary>
    public int ConsecutiveCheckInDays { get; set; } = 0;

    //Google Login
    public string? GoogleId { get; set; }          // null = đăng ký thường
    public bool EmailConfirmed { get; set; } = false;
}
