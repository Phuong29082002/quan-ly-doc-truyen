namespace QuanLyDocTruyen.API.Entities;

public class Story
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Author { get; set; } = "";
    public string? Description { get; set; }
    public string? CoverUrl { get; set; }
    public StoryStatus Status { get; set; } = StoryStatus.Ongoing;
    public AccessType AccessType { get; set; } = AccessType.Free;
    public decimal Price { get; set; }
    public int FreeChapterCount { get; set; }
    public long ViewCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<StoryGenre> StoryGenres { get; set; } = new();
    public List<Chapter> Chapters { get; set; } = new();
}