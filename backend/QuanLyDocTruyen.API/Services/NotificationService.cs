using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;
using QuanLyDocTruyen.API.Hubs;

namespace QuanLyDocTruyen.API.Services;

public interface INotificationService
{
    Task<List<NotificationDto>> GetMineAsync(int userId, int take = 50);
    Task<int> UnreadCountAsync(int userId);
    Task MarkReadAsync(int userId, int id);
    Task MarkAllReadAsync(int userId);

    /// <summary>Tạo thông báo cho nhiều người và đẩy ngay qua SignalR</summary>
    Task SendAsync(IEnumerable<int> userIds, string message, int? storyId, int? chapterId);

    /// <summary>PB29: tạo thông báo cho người theo dõi về các chương vừa phát hành (kể cả chương hẹn giờ)</summary>
    Task<int> DispatchNewChaptersAsync();
}

public class NotificationService(AppDbContext db, IHubContext<NotificationHub> hub, ILogger<NotificationService> logger) : INotificationService
{
    public Task<List<NotificationDto>> GetMineAsync(int userId, int take = 50) =>
        db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(Math.Clamp(take, 1, 100))
            .Select(n => new NotificationDto(n.Id, n.Message, n.StoryId, n.ChapterId,
                db.Chapters.Where(c => c.Id == n.ChapterId).Select(c => (int?)c.Number).FirstOrDefault(),
                n.IsRead, n.CreatedAt))
            .ToListAsync();

    public Task<int> UnreadCountAsync(int userId) => db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

    public async Task MarkReadAsync(int userId, int id)
    {
        var n = await db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId)
            ?? throw new NotFoundException("Không tìm thấy thông báo");
        n.IsRead = true;
        await db.SaveChangesAsync();
    }

    public Task MarkAllReadAsync(int userId) =>
        db.Notifications.Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

    public async Task SendAsync(IEnumerable<int> userIds, string message, int? storyId, int? chapterId)
    {
        var list = userIds.Distinct().Select(uid => new Notification
        {
            UserId = uid,
            Message = message,
            StoryId = storyId,
            ChapterId = chapterId
        }).ToList();
        if (list.Count == 0) return;

        db.Notifications.AddRange(list);
        await db.SaveChangesAsync();

        int? chapterNumber = chapterId is int cid
            ? await db.Chapters.Where(c => c.Id == cid).Select(c => (int?)c.Number).FirstOrDefaultAsync()
            : null;

        // PB46: đẩy thời gian thực tới những ai đang mở web
        foreach (var n in list)
        {
            try
            {
                await hub.Clients.Group(NotificationHub.GroupOf(n.UserId)).SendAsync("notification",
                    new NotificationDto(n.Id, n.Message, n.StoryId, n.ChapterId, chapterNumber, false, n.CreatedAt));
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Không gửi được thông báo thời gian thực tới người dùng {UserId}", n.UserId);
            }
        }
    }

    public async Task<int> DispatchNewChaptersAsync()
    {
        var now = DateTime.UtcNow;
        var since = now.AddDays(-3);

        // Chương đã phát hành gần đây mà chưa có thông báo nào gắn với nó
        var chapters = await db.Chapters.AsNoTracking()
            .Where(c => c.PublishAt <= now && c.PublishAt >= since &&
                        !db.Notifications.Any(n => n.ChapterId == c.Id) &&
                        db.Follows.Any(f => f.StoryId == c.StoryId))
            .OrderBy(c => c.PublishAt)
            .Select(c => new { c.Id, c.StoryId, c.Number, c.Title, StoryTitle = c.Story.Title })
            .Take(50)
            .ToListAsync();

        foreach (var c in chapters)
        {
            var followers = await db.Follows.Where(f => f.StoryId == c.StoryId).Select(f => f.UserId).ToListAsync();
            await SendAsync(followers, $"Truyện \"{c.StoryTitle}\" có chương mới: Chương {c.Number}: {c.Title}", c.StoryId, c.Id);
        }
        return chapters.Count;
    }
}

/// <summary>PB29: chạy nền mỗi 30 giây, gửi thông báo chương mới (chương hẹn giờ tới giờ cũng được báo)</summary>
public class NewChapterNotifier(IServiceScopeFactory scopes, ILogger<NewChapterNotifier> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Chờ ứng dụng khởi động xong (seed dữ liệu, migrate)
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var count = await scope.ServiceProvider.GetRequiredService<INotificationService>().DispatchNewChaptersAsync();
                if (count > 0) logger.LogInformation("Đã gửi thông báo cho {Count} chương mới", count);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Gửi thông báo chương mới thất bại");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
