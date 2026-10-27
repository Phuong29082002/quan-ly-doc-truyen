using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Controllers;

// PB08, PB09: Admin xem và sửa chương
[ApiController]
[Route("api/chapters")]
[Authorize(Roles = "Admin")]
public class ChaptersController(IChapterService chapters, IImageUploadService images) : ControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ChapterAdminDto>> Get(int id) => Ok(await chapters.GetForEditAsync(id));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ChapterAdminDto>> Update(int id, ChapterRequest req)
        => Ok(await chapters.UpdateAsync(id, req));

    // PB43: upload ảnh minh họa (multipart/form-data, field "file").
    // Trả về đường dẫn để chèn vào nội dung chương theo cú pháp ![mô tả](đường dẫn)
    [HttpPost("images")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ImageUploadResponse>> UploadImage(IFormFile file)
        => Ok(new ImageUploadResponse(await images.SaveAsync(file, "chapters")));
}
