using System.ComponentModel.DataAnnotations;

namespace QuanLyDocTruyen.API.DTOs;

/// <summary>PB58: Số dư xu và trạng thái điểm danh</summary>
public record CoinBalanceDto(
    int Coins,
    bool HasCheckedInToday,
    int ConsecutiveDays,
    DateTime? LastCheckInAt,
    int NextCheckInReward);

/// <summary>PB58: Kết quả điểm danh hằng ngày</summary>
public record CheckInResultDto(
    bool Success,
    int CoinsEarned,
    int NewBalance,
    int ConsecutiveDays,
    string Message);

/// <summary>PB58: Nhiệm vụ hằng ngày</summary>
public record DailyMissionDto(
    string Key,
    string Title,
    string Description,
    int Current,
    int Target,
    int RewardCoins,
    bool IsCompleted,
    bool IsClaimed);

/// <summary>PB58: Kết quả nhận thưởng nhiệm vụ</summary>
public record ClaimMissionResultDto(
    bool Success,
    int CoinsEarned,
    int NewBalance,
    string Message);

/// <summary>PB58: Lịch sử giao dịch xu</summary>
public record CoinTransactionDto(
    int Id,
    int Amount,
    string Type,
    string Description,
    DateTime CreatedAt);

/// <summary>PB58: Yêu cầu mở khóa chương bằng xu</summary>
public class UnlockChapterRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Vui lòng chọn chương hợp lệ")]
    public int ChapterId { get; set; }
}

/// <summary>PB58: Kết quả mở khóa chương bằng xu</summary>
public record UnlockChapterResultDto(
    bool Success,
    int ChapterId,
    int CoinsSpent,
    int NewBalance,
    string Message);

/// <summary>PB58: Gói nạp xu</summary>
public record CoinPackageDto(
    int Id,
    string Name,
    decimal Price,
    int Coins,
    int BonusCoins,
    string? Tag);

/// <summary>PB58: Yêu cầu nạp xu</summary>
public class TopUpCoinRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Vui lòng chọn gói nạp")]
    public int PackageId { get; set; }

    /// <summary>Cổng thanh toán: "Mock", "VNPay", "BankQR"</summary>
    public string Provider { get; set; } = "Mock";
}
