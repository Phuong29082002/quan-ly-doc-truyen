namespace QuanLyDocTruyen.API.Entities;

public class Follow
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int StoryId { get; set; }
    public Story Story { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}