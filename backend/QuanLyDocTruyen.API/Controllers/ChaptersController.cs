using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Controllers;

// PB08, PB09: Admin xem và sửa chương
[ApiController]
[Route("api/chapters")]
[Authorize(Roles = "Admin")]
public class ChaptersController(IChapterService chapters) : ControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ChapterAdminDto>> Get(int id) => Ok(await chapters.GetForEditAsync(id));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ChapterAdminDto>> Update(int id, ChapterRequest req)
        => Ok(await chapters.UpdateAsync(id, req));
}
