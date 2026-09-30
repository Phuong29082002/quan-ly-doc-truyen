namespace QuanLyDocTruyen.API.Entities;

public class CommentReport
{
    public int Id { get; set; }
    public int CommentId { get; set; }
    public Comment Comment { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Reason { get; set; } = "";
    public ReportStatus Status { get; set; } = ReportStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}