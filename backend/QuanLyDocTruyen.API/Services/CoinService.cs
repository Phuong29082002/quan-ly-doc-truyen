using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

public interface ICoinService
{
    Task<CoinBalanceDto> GetBalanceAsync(int userId);
    Task<CheckInResultDto> CheckInAsync(int userId);
    Task<List<DailyMissionDto>> GetMissionsAsync(int userId);
    Task<ClaimMissionResultDto> ClaimMissionRewardAsync(int userId, string missionKey);
    Task<UnlockChapterResultDto> UnlockChapterAsync(int userId, int chapterId);
    Task<PagedResult<CoinTransactionDto>> GetHistoryAsync(int userId, int page = 1, int pageSize = 20);
    List<CoinPackageDto> GetPackages();
    Task<PaymentStartDto> StartTopUpAsync(int userId, TopUpCoinRequest req, string returnUrl, string ipAddress);
}

public class CoinService(AppDbContext db) : ICoinService
{
    public const int DefaultChapterUnlockCost = 5;

    private static readonly List<CoinPackageDto> AvailablePackages =
    [
        new(1, "Gói Tân Thủ", 10_000m, 100, 0, "Cơ bản"),
        new(2, "Gói Đam Mê", 20_000m, 200, 20, "Phổ biến"),
        new(3, "Gói Cao Thủ", 50_000m, 500, 100, "Tiết kiệm +20%"),
        new(4, "Gói Đại Gia", 100_000m, 1000, 300, "VIP +30%")
    ];

    public async Task<CoinBalanceDto> GetBalanceAsync(int userId)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new NotFoundException("Không tìm thấy người dùng");

        var today = DateTime.UtcNow.Date;
        var hasCheckedInToday = user.LastCheckInAt.HasValue && user.LastCheckInAt.Value.Date == today;

        int nextStreak = hasCheckedInToday ? user.ConsecutiveCheckInDays : (user.LastCheckInAt.HasValue && user.LastCheckInAt.Value.Date == today.AddDays(-1) ? user.ConsecutiveCheckInDays + 1 : 1);
        int nextReward = (nextStreak % 7 == 0) ? 30 : 10;

        return new CoinBalanceDto(
            user.Coins,
            hasCheckedInToday,
            user.ConsecutiveCheckInDays,
            user.LastCheckInAt,
            nextReward);
    }

    public async Task<CheckInResultDto> CheckInAsync(int userId)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new NotFoundException("Không tìm thấy người dùng");

        var now = DateTime.UtcNow;
        var today = now.Date;

        if (user.LastCheckInAt.HasValue && user.LastCheckInAt.Value.Date == today)
            throw new BadRequestException("Bạn đã điểm danh hôm nay rồi! Hãy quay lại vào ngày mai nhé.");

        if (user.LastCheckInAt.HasValue && user.LastCheckInAt.Value.Date == today.AddDays(-1))
            user.ConsecutiveCheckInDays++;
        else
            user.ConsecutiveCheckInDays = 1;

        int reward = (user.ConsecutiveCheckInDays % 7 == 0) ? 30 : 10;
        user.Coins += reward;
        user.LastCheckInAt = now;

        db.CoinTransactions.Add(new CoinTransaction
        {
            UserId = userId,
            Amount = reward,
            Type = CoinTransactionType.DailyCheckIn,
            Description = $"Điểm danh ngày {user.ConsecutiveCheckInDays} liên tục (+{reward} xu)",
            CreatedAt = now
        });

        await db.SaveChangesAsync();

        return new CheckInResultDto(
            true,
            reward,
            user.Coins,
            user.ConsecutiveCheckInDays,
            user.ConsecutiveCheckInDays % 7 == 0
                ? $"Xuất sắc! Điểm danh chuỗi {user.ConsecutiveCheckInDays} ngày, bạn nhận được {reward} xu thưởng lớn!"
                : $"Điểm danh thành công ngày thứ {user.ConsecutiveCheckInDays}, bạn nhận được +{reward} xu!");
    }

    public async Task<List<DailyMissionDto>> GetMissionsAsync(int userId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayStart = DateTime.UtcNow.Date;

        // Đồng bộ tiến độ đọc và bình luận hôm nay của người dùng
        var readsToday = await db.ChapterViews.CountAsync(v => v.UserId == userId && v.ViewedAt >= todayStart);
        var commentsToday = await db.Comments.CountAsync(c => c.UserId == userId && c.CreatedAt >= todayStart);

        var existing = await db.DailyMissionProgresses
            .Where(m => m.UserId == userId && m.Date == today)
            .ToDictionaryAsync(m => m.MissionKey);

        var definitions = new[]
        {
            new { Key = "Read1", Title = "Mọt sách mới nhú", Desc = "Đọc 1 chương truyện bất kỳ hôm nay", Target = 1, Reward = 5, Current = readsToday },
            new { Key = "Read3", Title = "Độc giả chăm chỉ", Desc = "Đọc ít nhất 3 chương truyện hôm nay", Target = 3, Reward = 10, Current = readsToday },
            new { Key = "Read5", Title = "Đại thần đọc truyện", Desc = "Đọc ít nhất 5 chương truyện hôm nay", Target = 5, Reward = 15, Current = readsToday },
            new { Key = "Comment1", Title = "Tương tác sôi nổi", Desc = "Gửi ít nhất 1 bình luận thảo luận", Target = 1, Reward = 5, Current = commentsToday }
        };

        var result = new List<DailyMissionDto>();

        foreach (var def in definitions)
        {
            if (!existing.TryGetValue(def.Key, out var progress))
            {
                progress = new DailyMissionProgress
                {
                    UserId = userId,
                    Date = today,
                    MissionKey = def.Key,
                    CurrentProgress = Math.Min(def.Current, def.Target),
                    TargetProgress = def.Target,
                    RewardCoins = def.Reward,
                    IsClaimed = false
                };
                db.DailyMissionProgresses.Add(progress);
            }
            else if (!progress.IsClaimed && progress.CurrentProgress < def.Target)
            {
                progress.CurrentProgress = Math.Min(def.Current, def.Target);
            }

            result.Add(new DailyMissionDto(
                def.Key,
                def.Title,
                def.Desc,
                progress.CurrentProgress,
                progress.TargetProgress,
                progress.RewardCoins,
                progress.CurrentProgress >= progress.TargetProgress,
                progress.IsClaimed));
        }

        await db.SaveChangesAsync();
        return result;
    }

    public async Task<ClaimMissionResultDto> ClaimMissionRewardAsync(int userId, string missionKey)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var mission = await db.DailyMissionProgresses
            .FirstOrDefaultAsync(m => m.UserId == userId && m.Date == today && m.MissionKey == missionKey)
            ?? throw new NotFoundException("Không tìm thấy nhiệm vụ hoặc nhiệm vụ chưa bắt đầu");

        if (mission.IsClaimed)
            throw new BadRequestException("Bạn đã nhận thưởng nhiệm vụ này rồi!");

        if (mission.CurrentProgress < mission.TargetProgress)
            throw new BadRequestException("Bạn chưa hoàn thành mục tiêu nhiệm vụ để nhận thưởng!");

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new NotFoundException("Không tìm thấy người dùng");

        var now = DateTime.UtcNow;
        mission.IsClaimed = true;
        mission.ClaimedAt = now;
        user.Coins += mission.RewardCoins;

        db.CoinTransactions.Add(new CoinTransaction
        {
            UserId = userId,
            Amount = mission.RewardCoins,
            Type = CoinTransactionType.ReadingMission,
            Description = $"Thưởng hoàn thành nhiệm vụ [{missionKey}] (+{mission.RewardCoins} xu)",
            CreatedAt = now
        });

        await db.SaveChangesAsync();

        return new ClaimMissionResultDto(
            true,
            mission.RewardCoins,
            user.Coins,
            $"Nhận thưởng thành công +{mission.RewardCoins} xu!");
    }

    public async Task<UnlockChapterResultDto> UnlockChapterAsync(int userId, int chapterId)
    {
        var chapter = await db.Chapters.Include(c => c.Story).FirstOrDefaultAsync(c => c.Id == chapterId)
            ?? throw new NotFoundException("Không tìm thấy chương truyện");

        // Kiểm tra đã mở khóa trước đó chưa
        var alreadyUnlocked = await db.ChapterUnlocks.AnyAsync(u => u.UserId == userId && u.ChapterId == chapterId);
        if (alreadyUnlocked)
        {
            var u = await db.Users.AsNoTracking().FirstAsync(x => x.Id == userId);
            return new UnlockChapterResultDto(true, chapterId, 0, u.Coins, "Chương này bạn đã mở khóa trước đó rồi.");
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new NotFoundException("Không tìm thấy người dùng");

        const int cost = DefaultChapterUnlockCost;
        if (user.Coins < cost)
            throw new BadRequestException($"Số dư xu không đủ! Hiện tại bạn có {user.Coins} xu (cần {cost} xu để mở khóa). Hãy điểm danh hoặc nạp thêm xu nhé.");

        var now = DateTime.UtcNow;
        user.Coins -= cost;

        db.ChapterUnlocks.Add(new ChapterUnlock
        {
            UserId = userId,
            ChapterId = chapterId,
            StoryId = chapter.StoryId,
            CoinsSpent = cost,
            UnlockedAt = now
        });

        db.CoinTransactions.Add(new CoinTransaction
        {
            UserId = userId,
            Amount = -cost,
            Type = CoinTransactionType.UnlockChapter,
            Description = $"Mở khóa chương {chapter.Number}: {chapter.Title} (-{cost} xu)",
            CreatedAt = now
        });

        await db.SaveChangesAsync();

        return new UnlockChapterResultDto(
            true,
            chapterId,
            cost,
            user.Coins,
            $"Mở khóa thành công chương {chapter.Number}! Bạn có thể đọc chương này ngay bây giờ.");
    }

    public async Task<PagedResult<CoinTransactionDto>> GetHistoryAsync(int userId, int page = 1, int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = db.CoinTransactions.AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt);

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(t => new CoinTransactionDto(
                t.Id,
                t.Amount,
                t.Type.ToString(),
                t.Description,
                t.CreatedAt))
            .ToListAsync();

        return new PagedResult<CoinTransactionDto>(
            items,
            page,
            pageSize,
            total,
            (int)Math.Ceiling(total / (double)pageSize));
    }

    public List<CoinPackageDto> GetPackages() => AvailablePackages;

    public async Task<PaymentStartDto> StartTopUpAsync(int userId, TopUpCoinRequest req, string returnUrl, string ipAddress)
    {
        var pkg = AvailablePackages.FirstOrDefault(p => p.Id == req.PackageId)
            ?? throw new NotFoundException("Không tìm thấy gói nạp xu");

        var user = await db.Users.FindAsync(userId)
            ?? throw new NotFoundException("Không tìm thấy người dùng");

        var totalCoins = pkg.Coins + pkg.BonusCoins;

        var transaction = new Transaction
        {
            UserId = userId,
            Type = TransactionType.CoinTopUp,
            Amount = pkg.Price,
            CoinAmount = totalCoins,
            PackageMode = pkg.Name,
            Status = TransactionStatus.Pending
        };

        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();

        // Tận dụng hoàn toàn hệ thống payment hiện có
        return req.Provider.Equals("Mock", StringComparison.OrdinalIgnoreCase)
            ? new PaymentStartDto(transaction.Id, "Mock", null)
            : new PaymentStartDto(transaction.Id, req.Provider, null);
    }
}
