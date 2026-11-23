using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

public interface IReadingService
{
    /// <summary>PB26: ghi nhận chương đang đọc (gọi tự động khi mở chương)</summary>
    Task TrackChapterAsync(int userId, int storyId, int chapterId);

    /// <summary>PB26: lưu vị trí cuộn trong chương (Web và Mobile dùng chung)</summary>
    Task<ReadingProgressDto> SaveAsync(int userId, ReadingProgressRequest req);

    /// <summary>PB26: tiến độ của một truyện (null nếu chưa đọc)</summary>
    Task<ReadingProgressDto?> GetAsync(int userId, int storyId);

    /// <summary>PB27: danh sách truyện đang đọc, mới đọc gần nhất lên đầu</summary>
    Task<List<ReadingItemDto>> GetReadingListAsync(int userId);

    Task RemoveAsync(int userId, int storyId);
}

public class ReadingService(AppDbContext db, IBadgeService badges) : IReadingService
{
    public async Task TrackChapterAsync(int userId, int storyId, int chapterId)
    {
        var progress = await db.ReadingProgresses.FirstOrDefaultAsync(p => p.UserId == userId && p.StoryId == storyId);
        if (progress is null)
        {
            db.ReadingProgresses.Add(new ReadingProgress { UserId = userId, StoryId = storyId, ChapterId = chapterId });
        }
        else if (progress.ChapterId != chapterId)
        {
            // Sang chương khác: bắt đầu từ đầu chương
            progress.ChapterId = chapterId;
            progress.Position = 0;
            progress.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            progress.UpdatedAt = DateTime.UtcNow;
        }

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Hai yêu cầu mở chương gần như cùng lúc: bản ghi đã được tạo ở yêu cầu kia, bỏ qua
        }
                // PB60: cập nhật chuỗi ngày đọc và cấp huy hiệu. Lỗi ở đây không được làm hỏng việc đọc truyện
        try { await badges.RecordReadingAsync(userId); }
        catch (Exception) { }
    }

    public async Task<ReadingProgressDto> SaveAsync(int userId, ReadingProgressRequest req)
    {
        var now = DateTime.UtcNow;
        var chapter = await db.Chapters.FirstOrDefaultAsync(c =>
                c.StoryId == req.StoryId && c.Number == req.ChapterNumber && c.PublishAt <= now)
            ?? throw new NotFoundException("Không tìm thấy chương");

        var progress = await db.ReadingProgresses.FirstOrDefaultAsync(p => p.UserId == userId && p.StoryId == req.StoryId);
        if (progress is null)
        {
            progress = new ReadingProgress { UserId = userId, StoryId = req.StoryId };
            db.ReadingProgresses.Add(progress);
        }

        progress.ChapterId = chapter.Id;
        progress.Position = Math.Clamp(req.Position, 0, 1);
        progress.UpdatedAt = now;
        await db.SaveChangesAsync();

        return new ReadingProgressDto(req.StoryId, chapter.Number, chapter.Title, progress.Position, progress.UpdatedAt);
    }

    public Task<ReadingProgressDto?> GetAsync(int userId, int storyId) =>
        db.ReadingProgresses.AsNoTracking()
            .Where(p => p.UserId == userId && p.StoryId == storyId)
            .Select(p => new ReadingProgressDto(p.StoryId, p.Chapter.Number, p.Chapter.Title, p.Position, p.UpdatedAt))
            .FirstOrDefaultAsync();

    public async Task<List<ReadingItemDto>> GetReadingListAsync(int userId)
    {
        var now = DateTime.UtcNow;
        return await db.ReadingProgresses.AsNoTracking()
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.UpdatedAt)
            .Select(p => new ReadingItemDto(
                p.StoryId, p.Story.Title, p.Story.Author, p.Story.CoverUrl,
                p.Chapter.Number, p.Chapter.Title,
                p.Story.Chapters.Count(c => c.PublishAt <= now),
                p.Position, p.UpdatedAt))
            .ToListAsync();
    }

    public async Task RemoveAsync(int userId, int storyId)
    {
        var progress = await db.ReadingProgresses.FirstOrDefaultAsync(p => p.UserId == userId && p.StoryId == storyId)
            ?? throw new NotFoundException("Truyện không có trong danh sách đang đọc");
        db.ReadingProgresses.Remove(progress);
        await db.SaveChangesAsync();
    }
}
