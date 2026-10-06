using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

public interface IGenreService
{
    Task<List<GenreDto>> GetAllAsync();
    Task<GenreDto> CreateAsync(GenreRequest req);
    Task<GenreDto> UpdateAsync(int id, GenreRequest req);
    Task DeleteAsync(int id);
}

public class GenreService(AppDbContext db) : IGenreService
{
    public Task<List<GenreDto>> GetAllAsync() =>
        db.Genres.AsNoTracking()
            .OrderBy(g => g.Name)
            .Select(g => new GenreDto(g.Id, g.Name, g.StoryGenres.Count))
            .ToListAsync();

    public async Task<GenreDto> CreateAsync(GenreRequest req)
    {
        var name = req.Name.Trim();
        if (await db.Genres.AnyAsync(g => g.Name == name))
            throw new ConflictException("Thể loại đã tồn tại");

        var genre = new Genre { Name = name };
        db.Genres.Add(genre);
        await db.SaveChangesAsync();
        return new GenreDto(genre.Id, genre.Name, 0);
    }

    public async Task<GenreDto> UpdateAsync(int id, GenreRequest req)
    {
        var genre = await db.Genres.FindAsync(id) ?? throw new NotFoundException("Không tìm thấy thể loại");
        var name = req.Name.Trim();

        if (await db.Genres.AnyAsync(g => g.Name == name && g.Id != id))
            throw new ConflictException("Thể loại đã tồn tại");

        genre.Name = name;
        await db.SaveChangesAsync();

        var count = await db.StoryGenres.CountAsync(sg => sg.GenreId == id);
        return new GenreDto(genre.Id, genre.Name, count);
    }

    public async Task DeleteAsync(int id)
    {
        var genre = await db.Genres.FindAsync(id) ?? throw new NotFoundException("Không tìm thấy thể loại");

        if (await db.StoryGenres.AnyAsync(sg => sg.GenreId == id))
            throw new ConflictException("Không thể xóa thể loại đang được gán cho truyện");

        db.Genres.Remove(genre);
        await db.SaveChangesAsync();
    }
}
