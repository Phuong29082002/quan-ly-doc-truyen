using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Controllers;

/// <summary>PB58: Hệ thống xu: điểm danh hằng ngày, nhiệm vụ đọc, dùng xu mở khóa chương, nạp xu</summary>
[ApiController]
[Route("api/coins")]
public class CoinsController(ICoinService coins) : ControllerBase
{
    private int UserId => User.GetUserId()!.Value;

    /// <summary>Lấy số dư xu và trạng thái điểm danh hôm nay</summary>
    [HttpGet("balance")]
    [Authorize]
    public async Task<ActionResult<CoinBalanceDto>> GetBalance()
        => Ok(await coins.GetBalanceAsync(UserId));

    /// <summary>Điểm danh nhận xu hằng ngày</summary>
    [HttpPost("check-in")]
    [Authorize]
    public async Task<ActionResult<CheckInResultDto>> CheckIn()
        => Ok(await coins.CheckInAsync(UserId));

    /// <summary>Danh sách nhiệm vụ hằng ngày và tiến độ</summary>
    [HttpGet("missions")]
    [Authorize]
    public async Task<ActionResult<List<DailyMissionDto>>> GetMissions()
        => Ok(await coins.GetMissionsAsync(UserId));

    /// <summary>Nhận thưởng nhiệm vụ hằng ngày</summary>
    [HttpPost("missions/{missionKey}/claim")]
    [Authorize]
    public async Task<ActionResult<ClaimMissionResultDto>> ClaimMission(string missionKey)
        => Ok(await coins.ClaimMissionRewardAsync(UserId, missionKey));

    /// <summary>Mở khóa 1 chương truyện bằng xu</summary>
    [HttpPost("unlock-chapter")]
    [Authorize]
    public async Task<ActionResult<UnlockChapterResultDto>> UnlockChapter(UnlockChapterRequest req)
        => Ok(await coins.UnlockChapterAsync(UserId, req.ChapterId));

    /// <summary>Lịch sử biến động xu của người dùng</summary>
    [HttpGet("history")]
    [Authorize]
    public async Task<ActionResult<PagedResult<CoinTransactionDto>>> GetHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await coins.GetHistoryAsync(UserId, page, pageSize));

    /// <summary>Danh sách các gói nạp xu</summary>
    [HttpGet("packages")]
    public ActionResult<List<CoinPackageDto>> GetPackages()
        => Ok(coins.GetPackages());

    /// <summary>Tạo giao dịch nạp xu</summary>
    [HttpPost("top-up")]
    [Authorize]
    public async Task<ActionResult<PaymentStartDto>> StartTopUp(TopUpCoinRequest req)
    {
        var origin = Request.Headers.Origin.ToString();
        var returnUrl = string.IsNullOrWhiteSpace(origin) ? "http://localhost:8080" : origin;
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        return Ok(await coins.StartTopUpAsync(UserId, req, returnUrl, ip));
    }
}
