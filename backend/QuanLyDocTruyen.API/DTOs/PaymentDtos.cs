using System.ComponentModel.DataAnnotations;

namespace QuanLyDocTruyen.API.DTOs;

public class PaymentRequest
{
    [Required]
    public string Type { get; set; } = "Package";
    [Range(1, int.MaxValue)]
    public int ItemId { get; set; }
    public bool SimulateSuccess { get; set; } = true;
    public string PackageMode { get; set; } = "Purchase";
}

public record PaymentResultDto(int TransactionId, string Status, decimal Amount, DateTime CreatedAt, DateTime? PaidAt, string Message);
public record PaymentHistoryDto(int Id, string Type, string? ItemName, decimal Amount, string Status, DateTime CreatedAt, DateTime? PaidAt);
public record OwnedStoryDto(int StoryId, string Title, decimal Price, DateTime PurchasedAt);
public record ActivePackageDto(int PackageId, string PackageName, DateTime StartAt, DateTime EndAt, bool IsActive, bool IsPaused, int RemainingDays);
public record PaymentOverviewDto(List<PaymentHistoryDto> Transactions, List<OwnedStoryDto> PurchasedStories, List<ActivePackageDto> Packages);
public record ReconciliationDto(int TransactionId, int UserId, string Username, string Type, int? PackageId, int? StoryId, decimal Amount, DateTime PaidAt);
public class ReadingProgressRequest
{
    [Range(1, int.MaxValue)] public int StoryId { get; set; }
    [Range(1, int.MaxValue)] public int ChapterId { get; set; }
    [Range(0, double.MaxValue)] public double Position { get; set; }
}
public record ReadingProgressDto(int StoryId, string StoryTitle, int ChapterId, int ChapterNumber, string ChapterTitle, double Position, DateTime UpdatedAt);
