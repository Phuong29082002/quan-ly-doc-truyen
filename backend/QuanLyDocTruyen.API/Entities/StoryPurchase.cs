namespace QuanLyDocTruyen.API.Entities;

public class StoryPurchase
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int StoryId { get; set; }
    public Story Story { get; set; } = null!;
    public int TransactionId { get; set; }
    public Transaction Transaction { get; set; } = null!;
    public decimal Price { get; set; }
    public DateTime PurchasedAt { get; set; } = DateTime.UtcNow;
}