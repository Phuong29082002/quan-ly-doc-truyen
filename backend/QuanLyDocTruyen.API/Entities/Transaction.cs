namespace QuanLyDocTruyen.API.Entities;

public class Transaction
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public TransactionType Type { get; set; }
    public int? PackageId { get; set; }
    public Package? Package { get; set; }
    public int? StoryId { get; set; }
    public Story? Story { get; set; }
    public decimal Amount { get; set; }
    public TransactionStatus Status { get; set; } = TransactionStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
}