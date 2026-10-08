using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

public interface IPackageService
{
    /// <summary>Gói đang bán (cho người dùng đăng ký)</summary>
    Task<List<PackageDto>> GetActiveAsync();

    /// <summary>Tất cả gói, kể cả đã ngừng cung cấp (cho Admin)</summary>
    Task<List<PackageDto>> GetAllAsync();

    Task<PackageDto> GetAsync(int id);
    Task<PackageDto> CreateAsync(PackageRequest req);
    Task<PackageDto> UpdateAsync(int id, PackageRequest req);
}

// PB18: quản lý gói đọc tháng
public class PackageService(AppDbContext db) : IPackageService
{
    public Task<List<PackageDto>> GetActiveAsync() => QueryAsync(onlyActive: true);

    public Task<List<PackageDto>> GetAllAsync() => QueryAsync(onlyActive: false);

    public async Task<PackageDto> GetAsync(int id)
    {
        var list = await QueryAsync(onlyActive: false, id);
        return list.FirstOrDefault() ?? throw new NotFoundException("Không tìm thấy gói đọc");
    }

    public async Task<PackageDto> CreateAsync(PackageRequest req)
    {
        var storyIds = await ValidateStoriesAsync(req);

        var package = new Package
        {
            Name = req.Name.Trim(),
            Price = Math.Round(req.Price, 2),
            DurationDays = req.DurationDays,
            Scope = req.Scope,
            IsActive = req.IsActive,
            PackageStories = storyIds.Select(sid => new PackageStory { StoryId = sid }).ToList()
        };

        db.Packages.Add(package);
        await db.SaveChangesAsync();
        return await GetAsync(package.Id);
    }

    public async Task<PackageDto> UpdateAsync(int id, PackageRequest req)
    {
        var package = await db.Packages.Include(p => p.PackageStories).FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new NotFoundException("Không tìm thấy gói đọc");

        var storyIds = await ValidateStoriesAsync(req);

        // Đổi giá/thời hạn chỉ áp dụng cho lần mua sau; UserPackage đã có StartAt/EndAt riêng nên không bị ảnh hưởng
        package.Name = req.Name.Trim();
        package.Price = Math.Round(req.Price, 2);
        package.DurationDays = req.DurationDays;
        package.Scope = req.Scope;
        package.IsActive = req.IsActive;

        db.PackageStories.RemoveRange(package.PackageStories.Where(ps => !storyIds.Contains(ps.StoryId)));
        foreach (var sid in storyIds.Where(sid => package.PackageStories.All(ps => ps.StoryId != sid)))
            db.PackageStories.Add(new PackageStory { PackageId = package.Id, StoryId = sid });

        await db.SaveChangesAsync();
        return await GetAsync(package.Id);
    }

    private async Task<List<PackageDto>> QueryAsync(bool onlyActive, int? id = null)
    {
        var now = DateTime.UtcNow;
        var query = db.Packages.AsNoTracking().AsQueryable();
        if (onlyActive) query = query.Where(p => p.IsActive);
        if (id is int pid) query = query.Where(p => p.Id == pid);

        var packages = await query
            .OrderByDescending(p => p.IsActive).ThenBy(p => p.Price).ThenBy(p => p.Id)
            .Select(p => new
            {
                p.Id, p.Name, p.Price, p.DurationDays, p.Scope, p.IsActive, p.CreatedAt,
                ActiveUsers = db.UserPackages.Where(up => up.PackageId == p.Id && up.EndAt > now)
                    .Select(up => up.UserId).Distinct().Count(),
                Stories = p.PackageStories.OrderBy(ps => ps.Story.Title)
                    .Select(ps => new PackageStoryRefDto(ps.StoryId, ps.Story.Title)).ToList()
            })
            .ToListAsync();

        return packages
            .Select(p => new PackageDto(p.Id, p.Name, p.Price, p.DurationDays, p.Scope, p.IsActive, p.CreatedAt, p.ActiveUsers, p.Stories))
            .ToList();
    }

    // Scope = All: bỏ danh sách truyện; Scope = Selected: bắt buộc chọn ít nhất 1 truyện hợp lệ
    private async Task<List<int>> ValidateStoriesAsync(PackageRequest req)
    {
        if (req.Scope == PackageScope.All) return [];

        var ids = req.StoryIds.Distinct().ToList();
        if (ids.Count == 0)
            throw new BadRequestException("Gói áp dụng cho một số truyện phải chọn ít nhất một truyện");

        var existing = await db.Stories.CountAsync(s => ids.Contains(s.Id));
        if (existing != ids.Count)
            throw new BadRequestException("Có truyện không tồn tại");

        return ids;
    }
}
