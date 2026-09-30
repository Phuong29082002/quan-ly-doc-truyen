namespace QuanLyDocTruyen.API.Entities;

public class Chapter
{
    public int Id { get; set; }
    public int StoryId { get; set; }
    public Story Story { get; set; } = null!;
    public int Number { get; set; }
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public bool IsFree { get; set; }
    public DateTime PublishAt { get; set; } = DateTime.UtcNow;
    public long ViewCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}