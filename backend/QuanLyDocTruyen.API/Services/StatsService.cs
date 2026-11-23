using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

public interface IStatsService
{
    Task<StatsDto> GetAsync(StatsQuery q);
    /// <summary>PB54: xuất báo cáo thống kê ra file Excel</summary>
    Task<byte[]> ExportAsync(StatsQuery q);
}

/// <summary>
/// PB35, PB36, PB37: thống kê thành viên, giao dịch, doanh thu và nội dung trong một khoảng ngày.
/// Ngày tính theo giờ Việt Nam (UTC+7), dữ liệu trong CSDL lưu giờ UTC.
/// </summary>
public class StatsService(AppDbContext db) : IStatsService
{
    private const int VnOffset = 7;

    private static (DateOnly From, DateOnly To, DateTime FromUtc, DateTime ToUtc) Range(StatsQuery q)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(VnOffset));
        var to = q.To ?? today;
        var from = q.From ?? to.AddDays(-29);
        if (from > to) (from, to) = (to, from);
        if (to.DayNumber - from.DayNumber > 366) throw new BadRequestException("Chỉ thống kê tối đa 1 năm mỗi lần");
        return (from, to,
            from.ToDateTime(TimeOnly.MinValue).AddHours(-VnOffset),
            to.AddDays(1).ToDateTime(TimeOnly.MinValue).AddHours(-VnOffset));
    }

    public async Task<StatsDto> GetAsync(StatsQuery q)
    {
        var (from, to, f, t) = Range(q);
        var now = DateTime.UtcNow;

        var members = db.Users.AsNoTracking().Where(u => u.Role == UserRole.Member);
        var views = db.ChapterViews.AsNoTracking().Where(v => v.ViewedAt >= f && v.ViewedAt < t);
        var txInRange = db.Transactions.AsNoTracking().Where(x => x.CreatedAt >= f && x.CreatedAt < t);
        var paid = db.Transactions.AsNoTracking()
            .Where(x => x.Status == TransactionStatus.Success && x.PaidAt >= f && x.PaidAt < t);

        var statusRows = await txInRange.GroupBy(x => x.Status)
            .Select(g => new { Status = g.Key, Count = g.Count(), Amount = g.Sum(x => x.Amount) })
            .ToListAsync();
        int StatusCount(TransactionStatus s) => statusRows.FirstOrDefault(x => x.Status == s)?.Count ?? 0;

        var paidRows = await paid
            .Select(x => new { x.Type, x.PackageMode, x.Amount })
            .ToListAsync();

        var totals = new StatsTotalsDto(
            Members: await members.CountAsync(),
            NewMembers: await members.CountAsync(u => u.CreatedAt >= f && u.CreatedAt < t),
            ActiveMembers: await views.Where(v => v.UserId != null).Select(v => v.UserId).Distinct().CountAsync(),
            Stories: await db.Stories.CountAsync(),
            Chapters: await db.Chapters.CountAsync(c => c.PublishAt <= now),
            Views: await views.LongCountAsync(),
            Revenue: paidRows.Sum(x => x.Amount),
            SuccessTransactions: paidRows.Count,
            PendingTransactions: StatusCount(TransactionStatus.Pending),
            FailedTransactions: StatusCount(TransactionStatus.Failed),
            PackageSubscriptions: paidRows.Count(x => x.Type == TransactionType.Package && x.PackageMode is "Purchase" or "Switch" or null),
            PackageRenewals: paidRows.Count(x => x.Type == TransactionType.Package && x.PackageMode == "Renew"),
            StoryPurchases: paidRows.Count(x => x.Type == TransactionType.Story),
            ActivePackages: await db.UserPackages.CountAsync(p => !p.IsPaused && p.StartAt <= now && p.EndAt > now),
            NewFollows: await db.Follows.CountAsync(x => x.CreatedAt >= f && x.CreatedAt < t),
            NewComments: await db.Comments.CountAsync(x => x.CreatedAt >= f && x.CreatedAt < t));

        // Số liệu theo từng ngày (giờ Việt Nam)
        var revenueByDay = await paid
            .GroupBy(x => x.PaidAt!.Value.AddHours(VnOffset).Date)
            .Select(g => new { Day = g.Key, Revenue = g.Sum(x => x.Amount), Count = g.Count() })
            .ToListAsync();
        var viewsByDay = await views
            .GroupBy(v => v.ViewedAt.AddHours(VnOffset).Date)
            .Select(g => new { Day = g.Key, Count = g.LongCount() })
            .ToListAsync();
        var usersByDay = await members.Where(u => u.CreatedAt >= f && u.CreatedAt < t)
            .GroupBy(u => u.CreatedAt.AddHours(VnOffset).Date)
            .Select(g => new { Day = g.Key, Count = g.Count() })
            .ToListAsync();

        var daily = new List<DailyPointDto>();
        for (var d = from; d <= to; d = d.AddDays(1))
        {
            var day = d.ToDateTime(TimeOnly.MinValue);
            var rev = revenueByDay.FirstOrDefault(x => x.Day == day);
            daily.Add(new DailyPointDto(d, rev?.Revenue ?? 0,
                viewsByDay.FirstOrDefault(x => x.Day == day)?.Count ?? 0,
                usersByDay.FirstOrDefault(x => x.Day == day)?.Count ?? 0,
                rev?.Count ?? 0));
        }

        var byPackage = (await paid.Where(x => x.Type == TransactionType.Package && x.Amount > 0)
                .GroupBy(x => x.Package!.Name)
                .Select(g => new { Name = g.Key, Count = g.Count(), Revenue = g.Sum(x => x.Amount) })
                .ToListAsync())
            .Select(x => new RevenueItemDto(x.Name, x.Count, x.Revenue))
            .OrderByDescending(x => x.Revenue).ToList();

        var byStory = (await paid.Where(x => x.Type == TransactionType.Story)
                .GroupBy(x => x.Story!.Title)
                .Select(g => new { Name = g.Key, Count = g.Count(), Revenue = g.Sum(x => x.Amount) })
                .ToListAsync())
            .Select(x => new RevenueItemDto(x.Name, x.Count, x.Revenue))
            .OrderByDescending(x => x.Revenue).ToList();

        // Nội dung: đọc nhiều trong kỳ, kèm số theo dõi, số lượt mua trong kỳ và điểm đánh giá
        var topViews = await views.GroupBy(v => v.StoryId)
            .Select(g => new { StoryId = g.Key, Views = g.LongCount() })
            .OrderByDescending(x => x.Views).Take(10)
            .ToListAsync();
        var topIds = topViews.Select(x => x.StoryId).ToList();
        var storyInfo = await db.Stories.AsNoTracking().Where(s => topIds.Contains(s.Id))
            .Select(s => new
            {
                s.Id, s.Title, s.RatingAverage, s.RatingCount,
                Follows = db.Follows.Count(x => x.StoryId == s.Id),
                Purchases = db.StoryPurchases.Count(p => p.StoryId == s.Id && p.PurchasedAt >= f && p.PurchasedAt < t)
            })
            .ToDictionaryAsync(s => s.Id);
        var topStories = topViews.Where(x => storyInfo.ContainsKey(x.StoryId)).Select(x =>
        {
            var s = storyInfo[x.StoryId];
            return new ContentItemDto(s.Id, s.Title, x.Views, s.Follows, s.Purchases, s.RatingAverage, s.RatingCount);
        }).ToList();

        var genres = (await db.StoryGenres.AsNoTracking()
                .Select(sg => new
                {
                    sg.GenreId, sg.Genre.Name, sg.StoryId,
                    Views = db.ChapterViews.LongCount(v => v.StoryId == sg.StoryId && v.ViewedAt >= f && v.ViewedAt < t)
                })
                .ToListAsync())
            .GroupBy(x => new { x.GenreId, x.Name })
            .Select(g => new GenreStatDto(g.Key.GenreId, g.Key.Name, g.Sum(x => x.Views), g.Select(x => x.StoryId).Distinct().Count()))
            .OrderByDescending(x => x.Views)
            .ToList();

        var statuses = statusRows
            .Select(x => new TransactionStatusStatDto(x.Status.ToString(), x.Count, x.Amount))
            .ToList();

        return new StatsDto(from, to, totals, daily, byPackage, byStory, statuses, topStories, genres);
    }

    public async Task<byte[]> ExportAsync(StatsQuery q)
    {
        var s = await GetAsync(q);
        var (_, _, f, t) = Range(new StatsQuery { From = s.From, To = s.To });
        var period = $"Từ {s.From:dd/MM/yyyy} đến {s.To:dd/MM/yyyy}";
        var x = s.Totals;

        var transactions = await db.Transactions.AsNoTracking()
            .Where(tr => tr.CreatedAt >= f && tr.CreatedAt < t)
            .OrderByDescending(tr => tr.CreatedAt)
            .Select(tr => new
            {
                tr.Id, tr.User.Username, tr.User.DisplayName, tr.Type, tr.PackageMode, tr.Status, tr.Amount, tr.CreatedAt, tr.PaidAt,
                Item = tr.Type == TransactionType.Package ? tr.Package!.Name : tr.Story!.Title
            })
            .ToListAsync();

        static string StatusVi(string st) => st switch { "Success" => "Thành công", "Pending" => "Đang chờ", "Failed" => "Thất bại", _ => st };
        static string ModeVi(string? m) => m switch { "Renew" => "Gia hạn", "Switch" => "Chuyển gói", "Restore" => "Khôi phục", _ => "Đăng ký mới" };

        return new XlsxWriter()
            .AddSheet("Tổng quan", $"Báo cáo thống kê, {period}", ["Chỉ số", "Giá trị"],
            [
                ["Tổng số thành viên", x.Members],
                ["Thành viên mới trong kỳ", x.NewMembers],
                ["Thành viên có đọc truyện trong kỳ", x.ActiveMembers],
                ["Số truyện", x.Stories],
                ["Số chương đã phát hành", x.Chapters],
                ["Lượt đọc trong kỳ", x.Views],
                ["Doanh thu (đồng)", x.Revenue],
                ["Giao dịch thành công", x.SuccessTransactions],
                ["Giao dịch đang chờ", x.PendingTransactions],
                ["Giao dịch thất bại", x.FailedTransactions],
                ["Lượt đăng ký gói", x.PackageSubscriptions],
                ["Lượt gia hạn gói", x.PackageRenewals],
                ["Lượt mua truyện", x.StoryPurchases],
                ["Gói đang còn hạn (hiện tại)", x.ActivePackages],
                ["Lượt theo dõi mới", x.NewFollows],
                ["Bình luận mới", x.NewComments],
            ], [40, 18])
            .AddSheet("Theo ngày", $"Số liệu theo ngày, {period}", ["Ngày", "Doanh thu (đồng)", "Số giao dịch", "Lượt đọc", "Thành viên mới"],
                s.Daily.Select(d => new object?[] { d.Date, d.Revenue, d.Transactions, d.Views, d.NewMembers }), [14, 20, 14, 12, 16])
            .AddSheet("Doanh thu theo gói", $"Doanh thu theo gói đọc, {period}", ["Gói đọc", "Số giao dịch", "Doanh thu (đồng)"],
                s.RevenueByPackage.Select(r => new object?[] { r.Name, r.Count, r.Revenue }), [30, 14, 20])
            .AddSheet("Doanh thu theo truyện", $"Doanh thu bán truyện, {period}", ["Truyện", "Lượt mua", "Doanh thu (đồng)"],
                s.RevenueByStory.Select(r => new object?[] { r.Name, r.Count, r.Revenue }), [40, 12, 20])
            .AddSheet("Truyện nổi bật", $"Truyện đọc nhiều trong kỳ, {period}", ["Hạng", "Truyện", "Lượt đọc", "Người theo dõi", "Lượt mua trong kỳ", "Điểm đánh giá", "Lượt đánh giá"],
                s.TopStories.Select((c, i) => new object?[] { i + 1, c.Title, c.Views, c.Follows, c.Purchases, c.RatingAverage, c.RatingCount }), [8, 40, 12, 16, 18, 14, 14])
            .AddSheet("Thể loại", $"Thể loại được quan tâm, {period}", ["Thể loại", "Số truyện", "Lượt đọc"],
                s.Genres.Select(g => new object?[] { g.Name, g.Stories, g.Views }), [24, 12, 12])
            .AddSheet("Giao dịch", $"Danh sách giao dịch, {period}", ["Mã", "Tài khoản", "Tên hiển thị", "Loại", "Nội dung", "Số tiền (đồng)", "Trạng thái", "Tạo lúc", "Thanh toán lúc"],
                transactions.Select(tr => new object?[]
                {
                    tr.Id, tr.Username, tr.DisplayName,
                    tr.Type == TransactionType.Package ? $"Gói đọc, {ModeVi(tr.PackageMode).ToLowerInvariant()}" : "Mua truyện",
                    tr.Item, tr.Amount, StatusVi(tr.Status.ToString()),
                    tr.CreatedAt.AddHours(VnOffset), tr.PaidAt?.AddHours(VnOffset)
                }), [8, 16, 22, 22, 34, 16, 12, 18, 18])
            .ToBytes();
    }
}
