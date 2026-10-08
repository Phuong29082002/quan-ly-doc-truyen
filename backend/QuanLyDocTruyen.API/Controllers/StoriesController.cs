using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Controllers;

[ApiController]
[Route("api/stories")]
public class StoriesController(IStoryService stories, IChapterService chapters) : ControllerBase
{
    // PB11, PB12: tìm kiếm, lọc, sắp xếp
    [HttpGet]
    public async Task<ActionResult<PagedResult<StoryListItemDto>>> Search([FromQuery] StoryQuery q)
        => Ok(await stories.SearchAsync(q));

    // PB13: chi tiết truyện. Admin thấy cả chương hẹn giờ chưa phát hành
    [HttpGet("{id:int}")]
    public async Task<ActionResult<StoryDetailDto>> Detail(int id)
        => Ok(await stories.GetDetailAsync(id, includeUnpublished: User.IsInRole("Admin")));

    // PB06
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<StoryDetailDto>> Create(StoryRequest req)
        => Ok(await stories.CreateAsync(req));

    // PB06, PB07
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<StoryDetailDto>> Update(int id, StoryRequest req)
        => Ok(await stories.UpdateAsync(id, req));

    // PB06: ảnh bìa (multipart/form-data, field "file")
    [Authorize(Roles = "Admin")]
    [HttpPost("{id:int}/cover")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<CoverResponse>> UploadCover(int id, IFormFile file)
        => Ok(await stories.UploadCoverAsync(id, file));

    // PB14: đọc chương
    [HttpGet("{storyId:int}/chapters/{number:int}")]
    public async Task<ActionResult<ChapterContentDto>> ReadChapter(int storyId, int number)
        => Ok(await chapters.ReadAsync(storyId, number, User.GetUserId(), User.IsInRole("Admin")));

    // PB08: thêm chương
    [Authorize(Roles = "Admin")]
    [HttpPost("{storyId:int}/chapters")]
    public async Task<ActionResult<ChapterAdminDto>> CreateChapter(int storyId, ChapterRequest req)
        => Ok(await chapters.CreateAsync(storyId, req));
}
