using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Controllers;

[ApiController]
[Authorize]
[Route("api/reading-progress")]
public class ReadingProgressController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ReadingProgressDto>>> GetAll()
    {
        var userId = User.GetUserId()!.Value;
        var items = await db.ReadingProgresses.AsNoTracking().Where(x => x.UserId == userId)
            .OrderByDescending(x => x.UpdatedAt)
            .Select(x => new ReadingProgressDto(x.StoryId, x.Story.Title, x.ChapterId, x.Chapter.Number, x.Chapter.Title, x.Position, x.UpdatedAt)).ToListAsync();
        return Ok(items);
    }

    [HttpGet("{storyId:int}")]
    public async Task<ActionResult<ReadingProgressDto>> Get(int storyId)
    {
        var userId = User.GetUserId()!.Value;
        var item = await db.ReadingProgresses.AsNoTracking().Where(x => x.UserId == userId && x.StoryId == storyId)
            .Select(x => new ReadingProgressDto(x.StoryId, x.Story.Title, x.ChapterId, x.Chapter.Number, x.Chapter.Title, x.Position, x.UpdatedAt)).FirstOrDefaultAsync();
        return item == null ? NotFound() : Ok(item);
    }

    [HttpPut]
    public async Task<ActionResult<ReadingProgressDto>> Save(ReadingProgressRequest request)
    {
        var userId = User.GetUserId()!.Value;
        var chapter = await db.Chapters.FirstOrDefaultAsync(x => x.Id == request.ChapterId && x.StoryId == request.StoryId);
        if (chapter == null) return BadRequest(new { title = "Chương truyện không hợp lệ" });
        var progress = await db.ReadingProgresses.FirstOrDefaultAsync(x => x.UserId == userId && x.StoryId == request.StoryId);
        if (progress == null)
        {
            progress = new ReadingProgress { UserId = userId, StoryId = request.StoryId };
            db.ReadingProgresses.Add(progress);
        }
        progress.ChapterId = request.ChapterId;
        progress.Position = request.Position;
        progress.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        var result = await db.ReadingProgresses.AsNoTracking().Where(x => x.UserId == userId && x.StoryId == request.StoryId)
            .Select(x => new ReadingProgressDto(x.StoryId, x.Story.Title, x.ChapterId, x.Chapter.Number, x.Chapter.Title, x.Position, x.UpdatedAt)).FirstAsync();
        return Ok(result);
    }
}
