using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

// PB33: danh sách, tình trạng tài khoản, thông tin sử dụng dịch vụ; PB34: hạn chế / tạm ngừng tài khoản
public interface IAdminUserService
{
    Task<PagedResult<AdminUserDto>> SearchAsync(AdminUserQuery q);
    Task<AdminUserDetailDto> GetDetailAsync(int id);
    Task<AdminUserDto> SetStatusAsync(int adminId, int id, UserStatusRequest req);
}

public class AdminUserService(AppDbContext db, IPaymentService payments, IReadingService reading, IMemoryCache cache) : IAdminUserService
{
    public async Task<PagedResult<AdminUserDto>> SearchAsync(AdminUserQuery q)
    {
        var query = db.Users.AsNoTracking().AsQueryable();
        if (q.Status is UserStatus status) query = query.Where(u => u.Status == status);
        if (!string.IsNullOrWhiteSpace(q.Keyword))
        {
            var k = q.Keyword.Trim();
            query = query.Where(u => u.Username.Contains(k) || u.Email.Contains(k) || u.DisplayName.Contains(k));
        }

        var total = await query.CountAsync();
        var items = await Project(query.OrderByDescending(u => u.CreatedAt).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)).ToListAsync();
        return new PagedResult<AdminUserDto>(items, q.Page, q.PageSize, total, (int)Math.Ceiling(total / (double)q.PageSize));
    }

    public async Task<AdminUserDetailDto> GetDetailAsync(int id)
    {
        var user = await Project(db.Users.AsNoTracking().Where(u => u.Id == id)).FirstOrDefaultAsync()
            ?? throw new NotFoundException("Không tìm thấy tài khoản");
        var transactions = (await payments.GetMyTransactionsAsync(id)).Take(10).ToList();
        var readingList = (await reading.GetReadingListAsync(id)).Take(10).ToList();
        var follows = await FollowService.QueryFollows(db, db.Follows.Where(f => f.UserId == id));
        var reports = await db.CommentReports.CountAsync(r => r.Comment.UserId == id);
        return new AdminUserDetailDto(user, transactions, readingList, follows.Take(10).ToList(), reports);
    }

    public async Task<AdminUserDto> SetStatusAsync(int adminId, int id, UserStatusRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id) ?? throw new NotFoundException("Không tìm thấy tài khoản");
        if (user.Role == UserRole.Admin || user.Id == adminId)
            throw new BadRequestException("Không thể thay đổi trạng thái tài khoản quản trị");
        if (req.Status != UserStatus.Active && string.IsNullOrWhiteSpace(req.Reason))
            throw new BadRequestException("Vui lòng nhập lý do hạn chế / tạm ngừng");

        user.Status = req.Status;
        user.StatusReason = req.Status == UserStatus.Active ? null : req.Reason!.Trim();
        user.StatusChangedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        UserStatusCache.Invalidate(cache, id);

        return await Project(db.Users.AsNoTracking().Where(u => u.Id == id)).FirstAsync();
    }

    private IQueryable<AdminUserDto> Project(IQueryable<User> users)
    {
        var now = DateTime.UtcNow;
        return users.Select(u => new AdminUserDto(
            u.Id, u.Username, u.Email, u.DisplayName, u.AvatarUrl, u.Role, u.Status, u.StatusReason, u.CreatedAt,
            db.UserPackages.Where(up => up.UserId == u.Id && !up.IsPaused && up.StartAt <= now && up.EndAt > now)
                .OrderByDescending(up => up.EndAt).Select(up => up.Package.Name).FirstOrDefault(),
            db.UserPackages.Where(up => up.UserId == u.Id && !up.IsPaused && up.EndAt > now)
                .Max(up => (DateTime?)up.EndAt),
            db.StoryPurchases.Count(p => p.UserId == u.Id),
            db.Transactions.Where(t => t.UserId == u.Id && t.Status == TransactionStatus.Success).Sum(t => (decimal?)t.Amount) ?? 0,
            db.Comments.Count(c => c.UserId == u.Id),
            db.ReadingProgresses.Where(r => r.UserId == u.Id).Max(r => (DateTime?)r.UpdatedAt)));
    }
}

/// <summary>Bộ nhớ đệm ngắn trạng thái tài khoản, để chặn tài khoản bị tạm ngừng mà không truy vấn DB mỗi request</summary>
public static class UserStatusCache
{
    private static string Key(int userId) => $"user-status-{userId}";

    public static async Task<UserStatus?> GetAsync(IMemoryCache cache, AppDbContext db, int userId) =>
        await cache.GetOrCreateAsync(Key(userId), async e =>
        {
            e.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30);
            return await db.Users.Where(u => u.Id == userId).Select(u => (UserStatus?)u.Status).FirstOrDefaultAsync();
        });

    public static void Invalidate(IMemoryCache cache, int userId) => cache.Remove(Key(userId));
}
