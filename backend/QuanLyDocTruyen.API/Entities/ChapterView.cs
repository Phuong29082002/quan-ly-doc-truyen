namespace QuanLyDocTruyen.API.Entities;

public class ChapterView
{
    public long Id { get; set; }
    public int ChapterId { get; set; }
    public Chapter Chapter { get; set; } = null!;
    public int StoryId { get; set; }
    public int? UserId { get; set; }
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;
}