namespace QuanLyDocTruyen.API.DTOs;

/// <summary>PB60: một huy hiệu kèm trạng thái người dùng đã đạt hay chưa</summary>
public record BadgeDto(
    int Id, string Code, string Name, string Description, string Icon,
    string Criteria, int Threshold, bool Earned, DateTime? EarnedAt);

/// <summary>PB60: chuỗi ngày đọc, tổng số chương đã đọc và danh sách huy hiệu</summary>
public record BadgeSummaryDto(
    int CurrentStreak, int LongestStreak, int TotalChaptersRead, List<BadgeDto> Badges);