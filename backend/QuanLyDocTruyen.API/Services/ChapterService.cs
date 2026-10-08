using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

public interface IChapterService
{
    Task<ChapterContentDto> ReadAsync(int storyId, int number, int? userId, bool isAdmin);
    Task<ChapterAdminDto> GetForEditAsync(int id);
    Task<ChapterAdminDto> CreateAsync(int storyId, ChapterRequest req);
    Task<ChapterAdminDto> UpdateAsync(int id, ChapterRequest req);
}

public class ChapterService(AppDbContext db) : IChapterService
{
    // PB14, PB22: đọc chương. Chương miễn phí ai cũng đọc được; chương trả phí cần gói còn hạn hoặc đã mua truyện
    public async Task<ChapterContentDto> ReadAsync(int storyId, int number, int? userId, bool isAdmin)
    {
        var now = DateTime.UtcNow;

        var chapter = await db.Chapters
            .Include(c => c.Story)
            .FirstOrDefaultAsync(c => c.StoryId == storyId && c.Number == number && c.PublishAt <= now)
            ?? throw new NotFoundException("Không tìm thấy chương");

        var story = chapter.Story;
        var isFree = AccessRules.IsFreeChapter(story.AccessType, story.FreeChapterCount, chapter.Number, chapter.IsFree);
        if (!isFree && !isAdmin)
        {
            if (userId is null)
                throw PaidChapterDenied("LoginRequired", "Vui lòng đăng nhập để đọc chương trả phí", story, chapter.Number);

            if (await AccessRules.GetUserAccessAsync(db, userId.Value, storyId, now) == ReadAccess.None)
                throw PaidChapterDenied("PurchaseRequired", "Bạn cần đăng ký gói đọc hoặc mua truyện để đọc chương này", story, chapter.Number);
        }

        var prev = await db.Chapters
            .Where(c => c.StoryId == storyId && c.Number < number && c.PublishAt <= now)
            .MaxAsync(c => (int?)c.Number);

        var next = await db.Chapters
            .Where(c => c.StoryId == storyId && c.Number > number && c.PublishAt <= now)
            .MinAsync(c => (int?)c.Number);

        // Ghi nhận lượt đọc (phục vụ thống kê PB15, PB37)
        chapter.ViewCount++;
        story.ViewCount++;
        db.ChapterViews.Add(new ChapterView { ChapterId = chapter.Id, StoryId = storyId, UserId = userId });
        await db.SaveChangesAsync();

        return new ChapterContentDto(
            chapter.Id, storyId, story.Title, chapter.Number, chapter.Title,
            chapter.Content, chapter.PublishAt, prev, next);
    }

    public async Task<ChapterAdminDto> GetForEditAsync(int id)
    {
        var c = await db.Chapters.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new NotFoundException("Không tìm thấy chương");
        return ToAdminDto(c);
    }

    // PB08: tạo chương
    public async Task<ChapterAdminDto> CreateAsync(int storyId, ChapterRequest req)
    {
        var story = await db.Stories.FindAsync(storyId) ?? throw new NotFoundException("Không tìm thấy truyện");

        if (await db.Chapters.AnyAsync(c => c.StoryId == storyId && c.Number == req.Number))
            throw new ConflictException($"Chương số {req.Number} đã tồn tại");

        var now = DateTime.UtcNow;
        var chapter = new Chapter
        {
            StoryId = storyId,
            Number = req.Number,
            Title = req.Title.Trim(),
            Content = req.Content,
            IsFree = req.IsFree,
            PublishAt = req.PublishAt?.ToUniversalTime() ?? now
        };

        db.Chapters.Add(chapter);
        story.UpdatedAt = now;
        await db.SaveChangesAsync();

        return ToAdminDto(chapter);
    }

    // PB08, PB09: chỉnh sửa chương
    public async Task<ChapterAdminDto> UpdateAsync(int id, ChapterRequest req)
    {
        var chapter = await db.Chapters.Include(c => c.Story).FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new NotFoundException("Không tìm thấy chương");

        if (req.Number != chapter.Number &&
            await db.Chapters.AnyAsync(c => c.StoryId == chapter.StoryId && c.Number == req.Number))
            throw new ConflictException($"Chương số {req.Number} đã tồn tại");

        chapter.Number = req.Number;
        chapter.Title = req.Title.Trim();
        chapter.Content = req.Content;
        chapter.IsFree = req.IsFree;
        if (req.PublishAt is DateTime publishAt)
            chapter.PublishAt = publishAt.ToUniversalTime();

        chapter.Story.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return ToAdminDto(chapter);
    }

    // 403 kèm code/price để Web biết hiển thị yêu cầu đăng nhập hay mua gói/mua truyện
    private static ForbiddenException PaidChapterDenied(string code, string message, Story story, int chapterNumber) =>
        new(message)
        {
            Extensions =
            {
                ["code"] = code,
                ["storyId"] = story.Id,
                ["storyTitle"] = story.Title,
                ["chapterNumber"] = chapterNumber,
                ["price"] = story.Price
            }
        };

    private static ChapterAdminDto ToAdminDto(Chapter c) =>
        new(c.Id, c.StoryId, c.Number, c.Title, c.Content, c.IsFree, c.PublishAt);
}
