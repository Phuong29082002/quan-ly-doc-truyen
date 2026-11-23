using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Controllers;

// PB28: theo dõi / bỏ theo dõi truyện
[ApiController]
[Route("api/stories/{storyId:int}/follow")]
public class FollowsController(IFollowService follows) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<FollowStatusDto>> Status(int storyId)
        => Ok(await follows.GetStatusAsync(User.GetUserId(), storyId));

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<FollowStatusDto>> Follow(int storyId)
        => Ok(await follows.FollowAsync(User.GetUserId()!.Value, storyId));

    [Authorize]
    [HttpDelete]
    public async Task<ActionResult<FollowStatusDto>> Unfollow(int storyId)
        => Ok(await follows.UnfollowAsync(User.GetUserId()!.Value, storyId));
}

// PB28: truyện đang theo dõi; PB29: thông báo của tôi
[ApiController]
[Route("api/me")]
[Authorize]
public class MyCommunityController(IFollowService follows, INotificationService notifications) : ControllerBase
{
    private int UserId => User.GetUserId()!.Value;

    [HttpGet("follows")]
    public async Task<ActionResult<List<FollowedStoryDto>>> Follows() => Ok(await follows.GetMineAsync(UserId));

    [HttpGet("notifications")]
    public async Task<ActionResult<List<NotificationDto>>> Notifications() => Ok(await notifications.GetMineAsync(UserId));

    [HttpGet("notifications/unread-count")]
    public async Task<ActionResult<UnreadCountDto>> UnreadCount() => Ok(new UnreadCountDto(await notifications.UnreadCountAsync(UserId)));

    [HttpPost("notifications/{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        await notifications.MarkReadAsync(UserId, id);
        return NoContent();
    }

    [HttpPost("notifications/read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await notifications.MarkAllReadAsync(UserId);
        return NoContent();
    }
}

// PB30, PB31: thảo luận theo chương, báo cáo vi phạm
[ApiController]
public class CommentsController(ICommentService comments) : ControllerBase
{
    [HttpGet("api/chapters/{chapterId:int}/comments")]
    public async Task<ActionResult<List<CommentDto>>> List(int chapterId)
        => Ok(await comments.GetForChapterAsync(chapterId, User.IsInRole("Admin")));

    [Authorize]
    [HttpPost("api/chapters/{chapterId:int}/comments")]
    public async Task<ActionResult<CommentDto>> Create(int chapterId, CommentRequest req)
        => Ok(await comments.CreateAsync(User.GetUserId()!.Value, chapterId, req));

    [Authorize]
    [HttpDelete("api/comments/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await comments.DeleteAsync(User.GetUserId()!.Value, User.IsInRole("Admin"), id);
        return NoContent();
    }

    [Authorize]
    [HttpPost("api/comments/{id:int}/report")]
    public async Task<IActionResult> Report(int id, ReportRequest req)
    {
        await comments.ReportAsync(User.GetUserId()!.Value, id, req);
        return NoContent();
    }
}

// PB32: Admin kiểm duyệt thảo luận, xử lý báo cáo
[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminModerationController(ICommentService comments) : ControllerBase
{
    [HttpGet("reports")]
    public async Task<ActionResult<PagedResult<ReportDto>>> Reports([FromQuery] ReportStatus? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await comments.GetReportsAsync(status, page, pageSize));

    [HttpPost("reports/{id:int}/resolve")]
    public async Task<IActionResult> Resolve(int id, ResolveReportRequest req)
    {
        await comments.ResolveReportAsync(id, req.Action);
        return NoContent();
    }

    [HttpGet("comments")]
    public async Task<ActionResult<PagedResult<AdminCommentDto>>> Comments([FromQuery] AdminCommentQuery q)
        => Ok(await comments.GetAdminCommentsAsync(q));

    [HttpPatch("comments/{id:int}/hidden")]
    public async Task<IActionResult> SetHidden(int id, CommentHiddenRequest req)
    {
        await comments.SetHiddenAsync(id, req.Hidden);
        return NoContent();
    }
}

// PB33, PB34: quản lý thành viên
[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "Admin")]
public class AdminUsersController(IAdminUserService users) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<AdminUserDto>>> Search([FromQuery] AdminUserQuery q) => Ok(await users.SearchAsync(q));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AdminUserDetailDto>> Detail(int id) => Ok(await users.GetDetailAsync(id));

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<AdminUserDto>> SetStatus(int id, UserStatusRequest req)
        => Ok(await users.SetStatusAsync(User.GetUserId()!.Value, id, req));
}
