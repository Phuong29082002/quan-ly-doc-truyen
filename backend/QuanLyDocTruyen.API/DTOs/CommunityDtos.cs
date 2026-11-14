using System.ComponentModel.DataAnnotations;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.DTOs;

// ---------- Theo dõi truyện (PB28) ----------

public record FollowStatusDto(int StoryId, bool IsFollowing, int FollowerCount);

public record FollowedStoryDto(
    int StoryId,
    string Title,
    string Author,
    string? CoverUrl,
    StoryStatus Status,
    int ChapterCount,
    int? LatestChapterNumber,
    string? LatestChapterTitle,
    DateTime UpdatedAt,
    DateTime FollowedAt);

// ---------- Thông báo (PB29, PB46) ----------

public record NotificationDto(
    int Id,
    string Message,
    int? StoryId,
    int? ChapterId,
    int? ChapterNumber,
    bool IsRead,
    DateTime CreatedAt);

public record UnreadCountDto(int Count);

// ---------- Thảo luận theo chương (PB30, PB31, PB32) ----------

public record CommentDto(
    int Id,
    int ChapterId,
    int UserId,
    string DisplayName,
    string? AvatarUrl,
    // Bình luận bị ẩn: người thường thấy nội dung rỗng và cờ IsHidden
    string Content,
    bool IsHidden,
    DateTime CreatedAt,
    List<CommentDto> Replies);

public class CommentRequest
{
    [Required(ErrorMessage = "Vui lòng nhập nội dung")]
    [StringLength(1000, MinimumLength = 1, ErrorMessage = "Bình luận tối đa 1000 ký tự")]
    public string Content { get; set; } = "";

    /// <summary>Trả lời bình luận nào (null = bình luận mới)</summary>
    public int? ParentId { get; set; }
}

public class ReportRequest
{
    [Required(ErrorMessage = "Vui lòng chọn lý do báo cáo")]
    [StringLength(300, ErrorMessage = "Lý do tối đa 300 ký tự")]
    public string Reason { get; set; } = "";
}

public record ReportDto(
    int Id,
    int CommentId,
    string CommentContent,
    bool CommentHidden,
    int CommentUserId,
    string CommentAuthor,
    string Reporter,
    string Reason,
    ReportStatus Status,
    int StoryId,
    string StoryTitle,
    int ChapterNumber,
    // Số báo cáo đang chờ của cùng bình luận
    int PendingReportsOfComment,
    DateTime CreatedAt);

public class ResolveReportRequest
{
    /// <summary>Hide = ẩn bình luận, Delete = xóa bình luận, Reject = báo cáo không hợp lệ</summary>
    [Required]
    public string Action { get; set; } = "";
}

public record AdminCommentDto(
    int Id,
    string Content,
    bool IsHidden,
    int UserId,
    string Username,
    string DisplayName,
    int StoryId,
    string StoryTitle,
    int ChapterNumber,
    int ReportCount,
    DateTime CreatedAt);

public class AdminCommentQuery
{
    public string? Keyword { get; set; }
    public bool? Hidden { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}

public class CommentHiddenRequest
{
    public bool Hidden { get; set; }
}

// ---------- Quản lý thành viên (PB33, PB34) ----------

public class AdminUserQuery
{
    public string? Keyword { get; set; }
    public UserStatus? Status { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}

public record AdminUserDto(
    int Id,
    string Username,
    string Email,
    string DisplayName,
    string? AvatarUrl,
    UserRole Role,
    UserStatus Status,
    string? StatusReason,
    DateTime CreatedAt,
    string? ActivePackage,
    DateTime? ActivePackageEndAt,
    int PurchasedStories,
    decimal TotalPaid,
    int CommentCount,
    DateTime? LastReadAt);

public record AdminUserDetailDto(
    AdminUserDto User,
    List<TransactionDto> RecentTransactions,
    List<ReadingItemDto> Reading,
    List<FollowedStoryDto> Follows,
    int ReportsAgainst);

public class UserStatusRequest
{
    [Required]
    public UserStatus Status { get; set; }

    [StringLength(300, ErrorMessage = "Lý do tối đa 300 ký tự")]
    public string? Reason { get; set; }
}
