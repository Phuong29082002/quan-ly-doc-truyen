using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

public interface IStoryService
{
    Task<PagedResult<StoryListItemDto>> SearchAsync(StoryQuery q);
    Task<StoryDetailDto> GetDetailAsync(int id, bool includeUnpublished);
    Task<StoryDetailDto> CreateAsync(StoryRequest req);
    Task<StoryDetailDto> UpdateAsync(int id, StoryRequest req);
    Task<CoverResponse> UploadCoverAsync(int id, IFormFile file);
}

public class StoryService(AppDbContext db, IWebHostEnvironment env) : IStoryService
{
    private static readonly string[] AllowedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private const long MaxCoverSize = 2 * 1024 * 1024; // 2MB

    // PB11, PB12: tìm kiếm + lọc + sắp xếp + phân trang
    public async Task<PagedResult<StoryListItemDto>> SearchAsync(StoryQuery q)
    {
        var now = DateTime.UtcNow;
        var query = db.Stories.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(q.Keyword))
        {
            var k = q.Keyword.Trim();
            query = query.Where(s => s.Title.Contains(k) || s.Author.Contains(k));
        }

        if (q.GenreId is int genreId)
            query = query.Where(s => s.StoryGenres.Any(sg => sg.GenreId == genreId));

        if (q.Status is StoryStatus status)
            query = query.Where(s => s.Status == status);

        query = q.Sort switch
        {
            "views" => query.OrderByDescending(s => s.ViewCount).ThenByDescending(s => s.UpdatedAt),
            "newest" => query.OrderByDescending(s => s.CreatedAt),
            _ => query.OrderByDescending(s => s.UpdatedAt)
        };

        var total = await query.CountAsync();

        var items = await query
            .Skip((q.Page - 1) * q.PageSize)
            .Take(q.PageSize)
            .Select(s => new StoryListItemDto(
                s.Id,
                s.Title,
                s.Author,
                s.CoverUrl,
                s.Status,
                s.AccessType,
                s.StoryGenres.Select(sg => new GenreRefDto(sg.GenreId, sg.Genre.Name)).ToList(),
                s.Chapters.Count(c => c.PublishAt <= now),
                s.ViewCount,
                s.CreatedAt,
                s.UpdatedAt))
            .ToListAsync();

        var totalPages = (int)Math.Ceiling(total / (double)q.PageSize);
        return new PagedResult<StoryListItemDto>(items, q.Page, q.PageSize, total, totalPages);
    }

    // PB13: chi tiết truyện + danh sách chương kèm trạng thái truy cập
    public async Task<StoryDetailDto> GetDetailAsync(int id, bool includeUnpublished)
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

        var chapterDtos = chapters
            .Select(c => new ChapterListItemDto(
                c.Id,
                c.Number,
                c.Title,
                AccessRules.IsFreeChapter(story.AccessType, story.FreeChapterCount, c.Number, c.IsFree),
                c.PublishAt <= now,
                c.PublishAt))
            .ToList();

        return new StoryDetailDto(
            story.Id, story.Title, story.Author, story.Description, story.CoverUrl,
            story.Status, story.AccessType, story.Price, story.FreeChapterCount, story.ViewCount,
            story.CreatedAt, story.UpdatedAt, genres, chapterDtos);
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
            Description = req.Description?.Trim(),
            Status = req.Status,
            AccessType = req.AccessType,
            Price = price,
            FreeChapterCount = freeCount,
            StoryGenres = genreIds.Select(gid => new StoryGenre { GenreId = gid }).ToList()
        };

        db.Stories.Add(story);
        await db.SaveChangesAsync();

        return await GetDetailAsync(story.Id, includeUnpublished: true);
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

        return await GetDetailAsync(story.Id, includeUnpublished: true);
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
