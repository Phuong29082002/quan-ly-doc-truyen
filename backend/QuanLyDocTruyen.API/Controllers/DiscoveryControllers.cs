using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Controllers;

// PB49: đánh giá sao
[ApiController]
[Route("api/stories/{storyId:int}/rating")]
public class RatingsController(IRatingService ratings) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<RatingSummaryDto>> Get(int storyId)
        => Ok(await ratings.GetAsync(storyId, User.GetUserId()));

    [Authorize]
    [HttpPut]
    public async Task<ActionResult<RatingSummaryDto>> Rate(int storyId, RatingRequest req)
        => Ok(await ratings.RateAsync(User.GetUserId()!.Value, storyId, req.Score));

    [Authorize]
    [HttpDelete]
    public async Task<ActionResult<RatingSummaryDto>> Remove(int storyId)
        => Ok(await ratings.RemoveAsync(User.GetUserId()!.Value, storyId));
}

// PB49: bảng xếp hạng; PB50: gợi ý truyện
[ApiController]
public class DiscoveryController(IRankingService rankings, IRecommendationService recommendations) : ControllerBase
{
    [HttpGet("api/rankings")]
    public async Task<ActionResult<List<RankingItemDto>>> Rankings([FromQuery] RankingQuery q)
        => Ok(await rankings.GetAsync(q));

    /// <summary>Có đăng nhập: gợi ý theo sở thích; chưa đăng nhập: truyện được đọc nhiều</summary>
    [HttpGet("api/recommendations")]
    public async Task<ActionResult<List<RecommendationDto>>> ForMe([FromQuery] int limit = 12)
        => Ok(await recommendations.ForUserAsync(User.GetUserId(), limit));

    [HttpGet("api/stories/{storyId:int}/similar")]
    public async Task<ActionResult<List<RecommendationDto>>> Similar(int storyId, [FromQuery] int limit = 6)
        => Ok(await recommendations.SimilarAsync(storyId, limit));
}

// PB35, PB36, PB37: thống kê; PB54: xuất Excel
[ApiController]
[Route("api/admin/stats")]
[Authorize(Roles = "Admin")]
public class AdminStatsController(IStatsService stats) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<StatsDto>> Get([FromQuery] StatsQuery q) => Ok(await stats.GetAsync(q));

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] StatsQuery q)
    {
        var bytes = await stats.ExportAsync(q);
        var name = $"thong-ke-{(q.From ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-29))):yyyyMMdd}-{(q.To ?? DateOnly.FromDateTime(DateTime.UtcNow)):yyyyMMdd}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", name);
    }
}
