namespace QuanLyDocTruyen.API.Entities;

public class Comment
{
    public int Id { get; set; }
    public int ChapterId { get; set; }
    public Chapter Chapter { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int? ParentId { get; set; }
    public Comment? Parent { get; set; }
    public List<Comment> Replies { get; set; } = new();
    public string Content { get; set; } = "";
    public bool IsHidden { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}