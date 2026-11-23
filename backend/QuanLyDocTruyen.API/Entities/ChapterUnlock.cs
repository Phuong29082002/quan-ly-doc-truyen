namespace QuanLyDocTruyen.API.Entities;

/// <summary>PB58: Bản ghi mở khóa từng chương bằng xu (mở 1 lần đọc vĩnh viễn)</summary>
public class ChapterUnlock
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int ChapterId { get; set; }
    public Chapter Chapter { get; set; } = null!;

    public int StoryId { get; set; }
    public Story Story { get; set; } = null!;

    public int CoinsSpent { get; set; }
    public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;
}
