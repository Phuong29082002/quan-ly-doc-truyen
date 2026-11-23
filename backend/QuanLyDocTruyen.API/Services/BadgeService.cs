using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

public interface IBadgeService
{
    /// <summary>PB60: gọi mỗi khi người dùng đọc chương: cập nhật chuỗi ngày và cấp huy hiệu</summary>
    Task RecordReadingAsync(int userId);

    /// <summary>PB60: chuỗi ngày, số chương đã đọc và danh sách huy hiệu của người dùng</summary>
    Task<BadgeSummaryDto> GetSummaryAsync(int userId);
}

public class BadgeService(AppDbContext db) : IBadgeService
{
    // Tính "ngày" theo giờ Việt Nam (UTC+7) để chuỗi ngày đúng với người dùng
    private static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

    public async Task RecordReadingAsync(int userId)
    {
        var today = Today();
        var streak = await db.UserStreaks.FirstOrDefaultAsync(s => s.UserId == userId);

        if (streak is null)
        {
            streak = new UserStreak { UserId = userId, CurrentStreak = 1, LongestStreak = 1, LastReadDate = today };
            db.UserStreaks.Add(streak);
        }
        else if (streak.LastReadDate != today)
        {
            // Hôm qua có đọc thì cộng thêm 1, bỏ lỡ ngày nào thì bắt đầu lại từ 1
            streak.CurrentStreak = streak.LastReadDate == today.AddDays(-1) ? streak.CurrentStreak + 1 : 1;
            streak.LongestStreak = Math.Max(streak.LongestStreak, streak.CurrentStreak);
            streak.LastReadDate = today;
        }

        await db.SaveChangesAsync();
        await AwardBadgesAsync(userId, streak);
    }

    private async Task AwardBadgesAsync(int userId, UserStreak streak)
    {
        var chaptersRead = await CountChaptersReadAsync(userId);
        var ownedIds = await db.UserBadges.Where(b => b.UserId == userId).Select(b => b.BadgeId).ToListAsync();
        var candidates = await db.Badges.Where(b => !ownedIds.Contains(b.Id)).ToListAsync();

        foreach (var badge in candidates)
        {
            var value = badge.Criteria == BadgeCriteria.Streak ? streak.LongestStreak : chaptersRead;
            if (value >= badge.Threshold)
                db.UserBadges.Add(new UserBadge { UserId = userId, BadgeId = badge.Id });
        }
        await db.SaveChangesAsync();
    }

    // Đếm số chương khác nhau mà người dùng đã mở
    private Task<int> CountChaptersReadAsync(int userId) =>
        db.ChapterViews.Where(v => v.UserId == userId).Select(v => v.ChapterId).Distinct().CountAsync();

    public async Task<BadgeSummaryDto> GetSummaryAsync(int userId)
    {
        var streak = await db.UserStreaks.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == userId);
        var today = Today();

        // Quá 1 ngày không đọc thì chuỗi hiện tại coi như đã mất
        var current = streak is null || streak.LastReadDate is null || streak.LastReadDate < today.AddDays(-1)
            ? 0 : streak.CurrentStreak;

        var earned = await db.UserBadges.AsNoTracking()
            .Where(b => b.UserId == userId)
            .ToDictionaryAsync(b => b.BadgeId, b => b.EarnedAt);

        var badges = (await db.Badges.AsNoTracking().OrderBy(b => b.Criteria).ThenBy(b => b.Threshold).ToListAsync())
            .Select(b => new BadgeDto(
                b.Id, b.Code, b.Name, b.Description, b.Icon, b.Criteria.ToString(), b.Threshold,
                earned.ContainsKey(b.Id),
                earned.TryGetValue(b.Id, out var at) ? at : null))
            .ToList();

        return new BadgeSummaryDto(current, streak?.LongestStreak ?? 0, await CountChaptersReadAsync(userId), badges);
    }
}