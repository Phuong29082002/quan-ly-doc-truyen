namespace QuanLyDocTruyen.API.Entities;

/// <summary>PB58: Lịch sử biến động xu của người dùng</summary>
public class CoinTransaction
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>Số xu thay đổi (+ nhận được, - chi tiêu)</summary>
    public int Amount { get; set; }

    public CoinTransactionType Type { get; set; }
    public string Description { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
