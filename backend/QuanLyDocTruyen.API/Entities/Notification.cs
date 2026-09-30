namespace QuanLyDocTruyen.API.Entities;

public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Message { get; set; } = "";
    public int? StoryId { get; set; }
    public int? ChapterId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}