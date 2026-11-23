using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Controllers;

// Dữ liệu cá nhân của thành viên đang đăng nhập
[ApiController]
[Route("api/me")]
[Authorize]
public class MeController(IPaymentService payments, IReadingService reading, IBadgeService badges) : ControllerBase
{
    private int UserId => User.GetUserId()!.Value;

    // PB25: lịch sử thanh toán
    [HttpGet("transactions")]
    public async Task<ActionResult<List<TransactionDto>>> Transactions()
        => Ok(await payments.GetMyTransactionsAsync(UserId));

    // PB25: gói đang dùng, hạn gói, truyện đã mua
    [HttpGet("library")]
    public async Task<ActionResult<MyLibraryDto>> Library()
        => Ok(await payments.GetMyLibraryAsync(UserId));

    // PB27: truyện đang đọc
    [HttpGet("reading")]
    public async Task<ActionResult<List<ReadingItemDto>>> ReadingList()
        => Ok(await reading.GetReadingListAsync(UserId));

    // PB26: tiến độ đọc của một truyện (204 nếu chưa đọc)
    [HttpGet("reading/{storyId:int}")]
    public async Task<ActionResult<ReadingProgressDto>> Progress(int storyId)
    {
        var progress = await reading.GetAsync(UserId, storyId);
        if (progress is null) return NoContent();
        return Ok(progress);
    }

    // PB26: lưu vị trí đọc (đồng bộ Web và Mobile)
    [HttpPut("reading")]
    public async Task<ActionResult<ReadingProgressDto>> SaveProgress(ReadingProgressRequest req)
        => Ok(await reading.SaveAsync(UserId, req));

    // PB27: bỏ truyện khỏi danh sách đang đọc
    [HttpDelete("reading/{storyId:int}")]
    public async Task<IActionResult> RemoveProgress(int storyId)
    {
        await reading.RemoveAsync(UserId, storyId);
        return NoContent();
    }
    
    // PB60: chuỗi ngày đọc liên tục và huy hiệu thành tích
    [HttpGet("badges")]
    public async Task<ActionResult<BadgeSummaryDto>> Badges()
        => Ok(await badges.GetSummaryAsync(UserId));
}
