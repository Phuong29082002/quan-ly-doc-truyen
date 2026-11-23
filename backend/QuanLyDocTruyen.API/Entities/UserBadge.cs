namespace QuanLyDocTruyen.API.Entities;

public class UserBadge
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int BadgeId { get; set; }
    public Badge Badge { get; set; } = null!;
    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;
}