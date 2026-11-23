namespace QuanLyDocTruyen.API.Entities;

/// <summary>PB49: mỗi thành viên chấm một lần cho mỗi truyện (chấm lại thì sửa điểm cũ)</summary>
public class Rating
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int StoryId { get; set; }
    public Story Story { get; set; } = null!;
    public int Score { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
