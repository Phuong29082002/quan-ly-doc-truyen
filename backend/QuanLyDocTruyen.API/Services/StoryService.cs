using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

public interface IStoryService
{
    Task<PagedResult<StoryListItemDto>> SearchAsync(StoryQuery q);
    /// <summary>PB51: gợi ý tức thì khi đang gõ</summary>
    Task<List<StorySuggestionDto>> SuggestAsync(string? keyword, int limit);
    Task<StoryDetailDto> GetDetailAsync(int id, bool includeUnpublished, int? userId = null, bool isAdmin = false);
    Task<StoryDetailDto> CreateAsync(StoryRequest req);
    Task<StoryDetailDto> UpdateAsync(int id, StoryRequest req);
    Task<CoverResponse> UploadCoverAsync(int id, IFormFile file);
    /// <summary>Xóa truyện chưa phát sinh giao dịch, kèm toàn bộ chương và dữ liệu liên quan</summary>
    Task DeleteAsync(int id);
}

public class StoryService(AppDbContext db, IWebHostEnvironment env) : IStoryService
{
    private static readonly string[] AllowedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private const long MaxCoverSize = 2 * 1024 * 1024; // 2MB

    public async Task<List<StorySuggestionDto>> SuggestAsync(string? keyword, int limit)
    {
        var k = TextSearch.Normalize(keyword);
        if (k.Length == 0) return [];
        limit = Math.Clamp(limit, 1, 10);

        // Ưu tiên truyện có tên bắt đầu bằng từ khóa, sau đó tới truyện nhiều lượt đọc
        return await db.Stories.AsNoTracking()
            .Where(s => s.SearchText.Contains(k))
            .OrderByDescending(s => s.SearchText.StartsWith(k))
            .ThenByDescending(s => s.ViewCount)
            .Take(limit)
            .Select(s => new StorySuggestionDto(s.Id, s.Title, s.Author, s.CoverUrl))
            .ToListAsync();
    }

    // PB11, PB12: tìm kiếm + lọc + sắp xếp + phân trang
    public async Task<PagedResult<StoryListItemDto>> SearchAsync(StoryQuery q)
    {
        var now = DateTime.UtcNow;
        var query = db.Stories.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(q.Keyword))
        {
            // PB51: so khớp không dấu ("vu an" tìm ra "Vụ Án Phòng Số 7")
            var k = TextSearch.Normalize(q.Keyword);
            query = query.Where(s => s.SearchText.Contains(k));
        }

        if (q.GenreId is int genreId)
            query = query.Where(s => s.StoryGenres.Any(sg => sg.GenreId == genreId));

        if (q.Status is StoryStatus status)
            query = query.Where(s => s.Status == status);

        query = q.Sort switch
        {
            "views" => query.OrderByDescending(s => s.ViewCount).ThenByDescending(s => s.UpdatedAt),
            "newest" => query.OrderByDescending(s => s.CreatedAt),
            "rating" => query.OrderByDescending(s => s.RatingAverage).ThenByDescending(s => s.RatingCount),
            _ => query.OrderByDescending(s => s.UpdatedAt)
        };

        var total = await query.CountAsync();

        var items = await query
            .Skip((q.Page - 1) * q.PageSize)
            .Take(q.PageSize)
            .Select(StoryProjection.ListItem(now))
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(total / (double)q.PageSize);
        return new PagedResult<StoryListItemDto>(items, q.Page, q.PageSize, total, totalPages);
    }

    // PB13, PB22: chi tiết truyện + danh sách chương kèm trạng thái truy cập của người đang xem
    public async Task<StoryDetailDto> GetDetailAsync(int id, bool includeUnpublished, int? userId = null, bool isAdmin = false)
    {
        var now = DateTime.UtcNow;

        var story = await db.Stories.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new NotFoundException("Không tìm thấy truyện");

        var genres = await db.StoryGenres.AsNoTracking()
            .Where(sg => sg.StoryId == id)
            .OrderBy(sg => sg.Genre.Name)
            .Select(sg => new GenreRefDto(sg.GenreId, sg.Genre.Name))
            .ToListAsync();

        var chapters = await db.Chapters.AsNoTracking()
            .Where(c => c.StoryId == id && (includeUnpublished || c.PublishAt <= now))
            .OrderBy(c => c.Number)
            .Select(c => new { c.Id, c.Number, c.Title, c.IsFree, c.PublishAt })
            .ToListAsync();

        // Nguồn quyền đọc toàn bộ truyện: Admin / đã mua truyện / gói đọc còn hạn
        string? accessSource = null;
        if (isAdmin)
            accessSource = "Admin";
        else if (userId is int uid && story.AccessType != AccessType.Free)
            accessSource = (await AccessRules.GetUserAccessAsync(db, uid, id, now)) switch
            {
                ReadAccess.Purchased => "Purchase",
                ReadAccess.Package => "Package",
                _ => null
            };
        var hasFullAccess = accessSource is not null;

        var unlockedChapterIds = userId.HasValue && !hasFullAccess
            ? (await db.ChapterUnlocks.Where(u => u.UserId == userId.Value && u.StoryId == id).Select(u => u.ChapterId).ToListAsync()).ToHashSet()
            : [];

        var chapterDtos = chapters
            .Select(c =>
            {
                var isFree = AccessRules.IsFreeChapter(story.AccessType, story.FreeChapterCount, c.Number, c.IsFree);
                return new ChapterListItemDto(
                    c.Id, c.Number, c.Title, isFree, c.PublishAt <= now, c.PublishAt,
                    CanRead: isFree || hasFullAccess || unlockedChapterIds.Contains(c.Id));
            })
            .ToList();

        return new StoryDetailDto(
            story.Id, story.Title, story.Author, story.Description, story.CoverUrl,
            story.Status, story.AccessType, story.Price, story.FreeChapterCount, story.ViewCount,
            story.CreatedAt, story.UpdatedAt, genres, chapterDtos, hasFullAccess, accessSource,
            story.RatingAverage, story.RatingCount);
    }

    // PB06: tạo truyện, gán nhiều thể loại
    public async Task<StoryDetailDto> CreateAsync(StoryRequest req)
    {
        var genreIds = await ValidateGenresAsync(req.GenreIds);
        var (price, freeCount) = ValidateAccess(req);

        var story = new Story
        {
            Title = req.Title.Trim(),
            Author = req.Author.Trim(),
            SearchText = TextSearch.ForStory(req.Title, req.Author),
            Description = req.Description?.Trim(),
            Status = req.Status,
            AccessType = req.AccessType,
            Price = price,
            FreeChapterCount = freeCount,
            StoryGenres = genreIds.Select(gid => new StoryGenre { GenreId = gid }).ToList()
        };

        db.Stories.Add(story);
        await db.SaveChangesAsync();

        return await GetDetailAsync(story.Id, true, null, true);
    }

    // PB06, PB07: cập nhật thông tin + tình trạng phát hành
    public async Task<StoryDetailDto> UpdateAsync(int id, StoryRequest req)
    {
        var story = await db.Stories.Include(s => s.StoryGenres).FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new NotFoundException("Không tìm thấy truyện");

        var genreIds = await ValidateGenresAsync(req.GenreIds);
        var (price, freeCount) = ValidateAccess(req);

        story.Title = req.Title.Trim();
        story.Author = req.Author.Trim();
        story.SearchText = TextSearch.ForStory(story.Title, story.Author);
        story.Description = req.Description?.Trim();
        story.Status = req.Status;
        story.AccessType = req.AccessType;
        story.Price = price;
        story.FreeChapterCount = freeCount;
        story.UpdatedAt = DateTime.UtcNow;

        var toRemove = story.StoryGenres.Where(sg => !genreIds.Contains(sg.GenreId)).ToList();
        db.StoryGenres.RemoveRange(toRemove);

        foreach (var gid in genreIds.Where(gid => story.StoryGenres.All(sg => sg.GenreId != gid)))
            db.StoryGenres.Add(new StoryGenre { StoryId = story.Id, GenreId = gid });

        await db.SaveChangesAsync();

        return await GetDetailAsync(story.Id, true, null, true);
    }

    // PB06: upload ảnh bìa
    public async Task<CoverResponse> UploadCoverAsync(int id, IFormFile file)
    {
        var story = await db.Stories.FindAsync(id) ?? throw new NotFoundException("Không tìm thấy truyện");

        if (file is null || file.Length == 0)
            throw new BadRequestException("Vui lòng chọn ảnh bìa");
        if (file.Length > MaxCoverSize)
            throw new BadRequestException("Ảnh bìa tối đa 2MB");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(ext))
            throw new BadRequestException("Chỉ chấp nhận ảnh .jpg, .jpeg, .png, .webp");

        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var folder = Path.Combine(webRoot, "uploads", "covers");
        Directory.CreateDirectory(folder);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        await using (var stream = System.IO.File.Create(Path.Combine(folder, fileName)))
        {
            await file.CopyToAsync(stream);
        }

        // Xóa ảnh cũ nếu có
        if (story.CoverUrl is not null && story.CoverUrl.StartsWith("/uploads/covers/"))
        {
            var oldPath = Path.Combine(folder, Path.GetFileName(story.CoverUrl));
            if (System.IO.File.Exists(oldPath))
                System.IO.File.Delete(oldPath);
        }

        story.CoverUrl = $"/uploads/covers/{fileName}";
        story.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return new CoverResponse(story.CoverUrl);
    }

    // Xóa truyện. Truyện đã có người mua, có giao dịch hoặc có chương mở bằng xu thì không cho xóa để giữ lịch sử thanh toán.
    public async Task DeleteAsync(int id)
    {
        var story = await db.Stories.FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new NotFoundException("Không tìm thấy truyện");

        if (await db.StoryPurchases.AnyAsync(p => p.StoryId == id)
            || await db.Transactions.AnyAsync(t => t.StoryId == id)
            || await db.ChapterUnlocks.AnyAsync(u => u.StoryId == id))
            throw new ConflictException("Truyện đã có giao dịch mua hoặc mở khóa bằng xu nên không thể xóa (cần giữ lịch sử thanh toán). Bạn có thể sửa nội dung hoặc chuyển truyện sang miễn phí.");

        var chapterIds = await db.Chapters.Where(c => c.StoryId == id).Select(c => c.Id).ToListAsync();
        var comments = await db.Comments.Where(c => chapterIds.Contains(c.ChapterId)).ToListAsync();
        var commentIds = comments.Select(c => c.Id).ToList();

        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync() : null;

        // Bước 1: báo cáo bình luận và các trả lời (phải xóa trước bình luận gốc)
        db.CommentReports.RemoveRange(await db.CommentReports.Where(r => commentIds.Contains(r.CommentId)).ToListAsync());
        db.Comments.RemoveRange(comments.Where(c => c.ParentId != null));
        await db.SaveChangesAsync();

        // Bước 2: phần còn lại của truyện
        db.Comments.RemoveRange(comments.Where(c => c.ParentId == null));
        db.ChapterViews.RemoveRange(await db.ChapterViews.Where(v => v.StoryId == id).ToListAsync());
        db.ReadingProgresses.RemoveRange(await db.ReadingProgresses.Where(p => p.StoryId == id).ToListAsync());
        db.Follows.RemoveRange(await db.Follows.Where(f => f.StoryId == id).ToListAsync());
        db.Ratings.RemoveRange(await db.Ratings.Where(r => r.StoryId == id).ToListAsync());
        db.StoryGenres.RemoveRange(await db.StoryGenres.Where(g => g.StoryId == id).ToListAsync());
        db.PackageStories.RemoveRange(await db.PackageStories.Where(p => p.StoryId == id).ToListAsync());
        foreach (var n in await db.Notifications.Where(n => n.StoryId == id || (n.ChapterId != null && chapterIds.Contains(n.ChapterId.Value))).ToListAsync())
        {
            n.StoryId = null;
            n.ChapterId = null;
        }
        db.Chapters.RemoveRange(await db.Chapters.Where(c => c.StoryId == id).ToListAsync());
        db.Stories.Remove(story);
        await db.SaveChangesAsync();
        if (tx != null) await tx.CommitAsync();

        // Xóa ảnh bìa đã tải lên (ảnh mẫu trong thư mục library thì giữ lại)
        if (story.CoverUrl is not null && story.CoverUrl.StartsWith("/uploads/covers/"))
        {
            var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
            var path = Path.Combine(webRoot, "uploads", "covers", Path.GetFileName(story.CoverUrl));
            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
        }
    }

    // PB16, PB17: kiểm tra chính sách truy cập, trả về giá và số chương miễn phí đã chuẩn hóa
    private static (decimal Price, int FreeChapterCount) ValidateAccess(StoryRequest req)
    {
        switch (req.AccessType)
        {
            case AccessType.Free:
                return (0, 0);
            case AccessType.Paid:
                if (req.Price <= 0)
                    throw new BadRequestException("Truyện trả phí phải có giá lớn hơn 0");
                return (Math.Round(req.Price, 2), 0);
            default: // Mixed
                if (req.Price <= 0)
                    throw new BadRequestException("Truyện kết hợp phải có giá mua lớn hơn 0");
                return (Math.Round(req.Price, 2), req.FreeChapterCount);
        }
    }

    private async Task<List<int>> ValidateGenresAsync(List<int> ids)
    {
        var distinct = ids.Distinct().ToList();
        if (distinct.Count == 0)
            throw new BadRequestException("Chọn ít nhất một thể loại");

        var existing = await db.Genres.CountAsync(g => distinct.Contains(g.Id));
        if (existing != distinct.Count)
            throw new BadRequestException("Có thể loại không tồn tại");

        return distinct;
    }
}
