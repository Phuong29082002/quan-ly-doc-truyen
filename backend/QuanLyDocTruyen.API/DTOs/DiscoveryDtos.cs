using System.ComponentModel.DataAnnotations;

namespace QuanLyDocTruyen.API.DTOs;

// ---------- PB49: đánh giá sao ----------

/// <summary>Distribution[0] = số lượt 1 sao, ..., Distribution[4] = số lượt 5 sao; MyScore = điểm của người đang xem</summary>
public record RatingSummaryDto(int StoryId, double Average, int Count, int[] Distribution, int? MyScore);

public class RatingRequest
{
    [Range(1, 5, ErrorMessage = "Điểm đánh giá từ 1 đến 5 sao")]
    public int Score { get; set; }
}

// ---------- PB49: bảng xếp hạng ----------

public class RankingQuery
{
    /// <summary>views = đọc nhiều, rating = đánh giá cao, follows = theo dõi nhiều</summary>
    public string Type { get; set; } = "views";

    /// <summary>day, week, month hoặc all</summary>
    public string Period { get; set; } = "week";

    [Range(1, 50)]
    public int Limit { get; set; } = 20;
}

/// <summary>Value: số lượt đọc / điểm trung bình / số người theo dõi trong khoảng thời gian</summary>
public record RankingItemDto(int Rank, StoryListItemDto Story, double Value);

// ---------- PB50: gợi ý truyện ----------

public record RecommendationDto(StoryListItemDto Story, string Reason);

// ---------- PB35, PB36, PB37: thống kê ----------

public class StatsQuery
{
    /// <summary>Ngày bắt đầu (giờ Việt Nam), mặc định 30 ngày trước</summary>
    public DateOnly? From { get; set; }

    /// <summary>Ngày kết thúc (bao gồm cả ngày này)</summary>
    public DateOnly? To { get; set; }
}

public record StatsTotalsDto(
    int Members,
    int NewMembers,
    int ActiveMembers,
    int Stories,
    int Chapters,
    long Views,
    decimal Revenue,
    int SuccessTransactions,
    int PendingTransactions,
    int FailedTransactions,
    int PackageSubscriptions,
    int PackageRenewals,
    int StoryPurchases,
    int ActivePackages,
    int NewFollows,
    int NewComments);

public record DailyPointDto(DateOnly Date, decimal Revenue, long Views, int NewMembers, int Transactions);

public record RevenueItemDto(string Name, int Count, decimal Revenue);

public record ContentItemDto(int StoryId, string Title, long Views, int Follows, int Purchases, double RatingAverage, int RatingCount);

public record GenreStatDto(int GenreId, string Name, long Views, int Stories);

public record TransactionStatusStatDto(string Status, int Count, decimal Amount);

public record StatsDto(
    DateOnly From,
    DateOnly To,
    StatsTotalsDto Totals,
    List<DailyPointDto> Daily,
    List<RevenueItemDto> RevenueByPackage,
    List<RevenueItemDto> RevenueByStory,
    List<TransactionStatusStatDto> TransactionStatuses,
    List<ContentItemDto> TopStories,
    List<GenreStatDto> Genres);
