namespace QuanLyDocTruyen.API.Entities;

public class ReadingProgress
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int StoryId { get; set; }
    public Story Story { get; set; } = null!;
    public int ChapterId { get; set; }
    public Chapter Chapter { get; set; } = null!;
    public double Position { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}