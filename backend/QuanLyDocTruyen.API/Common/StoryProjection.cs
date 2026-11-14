using System.Linq.Expressions;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Common;

/// <summary>Chuyển Story thành StoryListItemDto ngay trong câu SQL (dùng chung cho tìm kiếm, xếp hạng, gợi ý)</summary>
public static class StoryProjection
{
    public static Expression<Func<Story, StoryListItemDto>> ListItem(DateTime now) => s => new StoryListItemDto(
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
        s.UpdatedAt,
        s.Chapters.Where(c => c.PublishAt <= now).OrderByDescending(c => c.Number).Select(c => (int?)c.Number).FirstOrDefault(),
        s.Chapters.Where(c => c.PublishAt <= now).OrderByDescending(c => c.Number).Select(c => c.Title).FirstOrDefault(),
        s.Description,
        s.RatingAverage,
        s.RatingCount);
}
