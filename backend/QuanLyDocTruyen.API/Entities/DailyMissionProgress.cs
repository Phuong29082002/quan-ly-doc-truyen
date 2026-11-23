namespace QuanLyDocTruyen.API.Entities;

/// <summary>PB58: Tiến độ nhiệm vụ hàng ngày của người dùng</summary>
public class DailyMissionProgress
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public DateOnly Date { get; set; }
    public string MissionKey { get; set; } = "";
    public int CurrentProgress { get; set; }
    public int TargetProgress { get; set; }
    public int RewardCoins { get; set; }
    public bool IsClaimed { get; set; }
    public DateTime? ClaimedAt { get; set; }
}
