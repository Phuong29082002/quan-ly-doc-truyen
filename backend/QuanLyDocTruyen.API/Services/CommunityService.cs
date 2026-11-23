using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

// ---------- PB28: theo dõi truyện ----------

public interface IFollowService
{
    Task<FollowStatusDto> GetStatusAsync(int? userId, int storyId);
    Task<FollowStatusDto> FollowAsync(int userId, int storyId);
    Task<FollowStatusDto> UnfollowAsync(int userId, int storyId);
    Task<List<FollowedStoryDto>> GetMineAsync(int userId);
}

public class FollowService(AppDbContext db) : IFollowService
{
    public async Task<FollowStatusDto> GetStatusAsync(int? userId, int storyId)
    {
        var count = await db.Follows.CountAsync(f => f.StoryId == storyId);
        var following = userId is int uid && await db.Follows.AnyAsync(f => f.StoryId == storyId && f.UserId == uid);
        return new FollowStatusDto(storyId, following, count);
    }

    public async Task<FollowStatusDto> FollowAsync(int userId, int storyId)
    {
        if (!await db.Stories.AnyAsync(s => s.Id == storyId))
            throw new NotFoundException("Không tìm thấy truyện");
        if (!await db.Follows.AnyAsync(f => f.StoryId == storyId && f.UserId == userId))
        {
            db.Follows.Add(new Follow { UserId = userId, StoryId = storyId });
            await db.SaveChangesAsync();
        }
        return await GetStatusAsync(userId, storyId);
    }

    public async Task<FollowStatusDto> UnfollowAsync(int userId, int storyId)
    {
        await db.Follows.Where(f => f.StoryId == storyId && f.UserId == userId).ExecuteDeleteAsync();
        return await GetStatusAsync(userId, storyId);
    }

    public Task<List<FollowedStoryDto>> GetMineAsync(int userId) => QueryFollows(db, db.Follows.Where(f => f.UserId == userId));

    internal static async Task<List<FollowedStoryDto>> QueryFollows(AppDbContext db, IQueryable<Follow> follows)
    {
        var now = DateTime.UtcNow;
        var rows = await follows.AsNoTracking()
            .OrderByDescending(f => f.Story.UpdatedAt)
            .Select(f => new
            {
                f.StoryId, f.Story.Title, f.Story.Author, f.Story.CoverUrl, f.Story.Status, f.Story.UpdatedAt, f.CreatedAt,
                Count = f.Story.Chapters.Count(c => c.PublishAt <= now),
                Latest = f.Story.Chapters.Where(c => c.PublishAt <= now).OrderByDescending(c => c.Number)
                    .Select(c => new { c.Number, c.Title }).FirstOrDefault()
            })
            .ToListAsync();

        return rows.Select(x => new FollowedStoryDto(
            x.StoryId, x.Title, x.Author, x.CoverUrl, x.Status, x.Count,
            x.Latest?.Number, x.Latest?.Title, x.UpdatedAt, x.CreatedAt)).ToList();
    }
}

// ---------- PB30, PB31, PB32: thảo luận theo chương, báo cáo, kiểm duyệt ----------

public interface ICommentService
{
    Task<List<CommentDto>> GetForChapterAsync(int chapterId, bool isAdmin);
    Task<CommentDto> CreateAsync(int userId, int chapterId, CommentRequest req);
    Task DeleteAsync(int userId, bool isAdmin, int commentId);
    Task ReportAsync(int userId, int commentId, ReportRequest req);

    Task<PagedResult<ReportDto>> GetReportsAsync(ReportStatus? status, int page, int pageSize);
    Task ResolveReportAsync(int reportId, string action);
    Task<PagedResult<AdminCommentDto>> GetAdminCommentsAsync(AdminCommentQuery q);
    Task SetHiddenAsync(int commentId, bool hidden);
}

public class CommentService(AppDbContext db, INotificationService notifications) : ICommentService
{
    public async Task<List<CommentDto>> GetForChapterAsync(int chapterId, bool isAdmin)
    {
        var now = DateTime.UtcNow;
        if (!await db.Chapters.AnyAsync(c => c.Id == chapterId && (isAdmin || c.PublishAt <= now)))
            throw new NotFoundException("Không tìm thấy chương");

        var rows = await db.Comments.AsNoTracking()
            .Where(c => c.ChapterId == chapterId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentRow(c.Id, c.ParentId, c.UserId, c.User.DisplayName, c.User.AvatarUrl, c.Content, c.IsHidden, c.CreatedAt))
            .ToListAsync();

        CommentDto Map(CommentRow r, List<CommentDto> replies) => new(
            r.Id, chapterId, r.UserId, r.DisplayName, r.AvatarUrl,
            r.IsHidden && !isAdmin ? "" : r.Content, r.IsHidden, r.CreatedAt, replies);

        var replies = rows.Where(r => r.ParentId != null)
            .GroupBy(r => r.ParentId!.Value)
            .ToDictionary(g => g.Key, g => g.Select(r => Map(r, [])).ToList());

        // Bình luận mới nhất lên đầu, câu trả lời theo thứ tự thời gian
        return rows.Where(r => r.ParentId == null)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => Map(r, replies.GetValueOrDefault(r.Id) ?? []))
            .ToList();
    }

    public async Task<CommentDto> CreateAsync(int userId, int chapterId, CommentRequest req)
    {
        var user = await db.Users.FindAsync(userId) ?? throw new NotFoundException("Không tìm thấy tài khoản");
        EnsureCanPost(user);

        var now = DateTime.UtcNow;
        var chapter = await db.Chapters.Include(c => c.Story)
            .FirstOrDefaultAsync(c => c.Id == chapterId && c.PublishAt <= now)
            ?? throw new NotFoundException("Không tìm thấy chương");

        var content = req.Content.Trim();
        if (content.Length == 0) throw new BadRequestException("Vui lòng nhập nội dung");

        Comment? parent = null;
        if (req.ParentId is int parentId)
        {
            parent = await db.Comments.FirstOrDefaultAsync(c => c.Id == parentId && c.ChapterId == chapterId)
                ?? throw new NotFoundException("Không tìm thấy bình luận cần trả lời");
            // Chỉ 1 cấp trả lời: trả lời một câu trả lời thì gắn vào bình luận gốc
            if (parent.ParentId is int rootId)
                parent = await db.Comments.FirstAsync(c => c.Id == rootId);
        }

        var comment = new Comment { ChapterId = chapterId, UserId = userId, ParentId = parent?.Id, Content = content };
        db.Comments.Add(comment);
        await db.SaveChangesAsync();

        // Báo cho người được trả lời (không báo khi tự trả lời mình)
        if (parent is not null && parent.UserId != userId)
            await notifications.SendAsync([parent.UserId],
                $"{user.DisplayName} đã trả lời bình luận của bạn ở \"{chapter.Story.Title}\" - Chương {chapter.Number}",
                chapter.StoryId, chapter.Id);

        return new CommentDto(comment.Id, chapterId, userId, user.DisplayName, user.AvatarUrl, comment.Content, false, comment.CreatedAt, []);
    }

    public async Task DeleteAsync(int userId, bool isAdmin, int commentId)
    {
        var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == commentId)
            ?? throw new NotFoundException("Không tìm thấy bình luận");
        if (!isAdmin && comment.UserId != userId)
            throw new ForbiddenException("Bạn chỉ được xóa bình luận của mình");
        await RemoveCommentAsync(comment.Id);
    }

    public async Task ReportAsync(int userId, int commentId, ReportRequest req)
    {
        var user = await db.Users.FindAsync(userId) ?? throw new NotFoundException("Không tìm thấy tài khoản");
        EnsureCanPost(user);

        var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == commentId)
            ?? throw new NotFoundException("Không tìm thấy bình luận");
        if (comment.UserId == userId)
            throw new BadRequestException("Không thể báo cáo bình luận của chính mình");
        if (await db.CommentReports.AnyAsync(r => r.CommentId == commentId && r.UserId == userId && r.Status == ReportStatus.Pending))
            throw new ConflictException("Bạn đã báo cáo bình luận này, quản trị viên sẽ xem xét");

        db.CommentReports.Add(new CommentReport { CommentId = commentId, UserId = userId, Reason = req.Reason.Trim() });
        await db.SaveChangesAsync();
    }

    public async Task<PagedResult<ReportDto>> GetReportsAsync(ReportStatus? status, int page, int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = db.CommentReports.AsNoTracking().AsQueryable();
        if (status is ReportStatus s) query = query.Where(r => r.Status == s);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(r => new ReportDto(
                r.Id, r.CommentId, r.Comment.Content, r.Comment.IsHidden, r.Comment.UserId, r.Comment.User.DisplayName,
                r.User.DisplayName, r.Reason, r.Status,
                r.Comment.Chapter.StoryId, r.Comment.Chapter.Story.Title, r.Comment.Chapter.Number,
                db.CommentReports.Count(x => x.CommentId == r.CommentId && x.Status == ReportStatus.Pending),
                r.CreatedAt))
            .ToListAsync();
        return new PagedResult<ReportDto>(items, page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
    }

    public async Task ResolveReportAsync(int reportId, string action)
    {
        var report = await db.CommentReports.Include(r => r.Comment).FirstOrDefaultAsync(r => r.Id == reportId)
            ?? throw new NotFoundException("Không tìm thấy báo cáo");

        switch (action.Trim().ToLowerInvariant())
        {
            case "hide":
                report.Comment.IsHidden = true;
                await ResolvePendingAsync(report.CommentId, ReportStatus.Resolved);
                break;
            case "delete":
                await RemoveCommentAsync(report.CommentId);
                break;
            case "reject":
                report.Status = ReportStatus.Rejected;
                await db.SaveChangesAsync();
                break;
            default:
                throw new BadRequestException("Hành động không hợp lệ (Hide, Delete, Reject)");
        }
    }

    public async Task<PagedResult<AdminCommentDto>> GetAdminCommentsAsync(AdminCommentQuery q)
    {
        var query = db.Comments.AsNoTracking().AsQueryable();
        if (q.Hidden is bool hidden) query = query.Where(c => c.IsHidden == hidden);
        if (!string.IsNullOrWhiteSpace(q.Keyword))
        {
            var k = q.Keyword.Trim();
            query = query.Where(c => c.Content.Contains(k) || c.User.Username.Contains(k) || c.User.DisplayName.Contains(k));
        }

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(c => c.CreatedAt)
            .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
            .Select(c => new AdminCommentDto(c.Id, c.Content, c.IsHidden, c.UserId, c.User.Username, c.User.DisplayName,
                c.Chapter.StoryId, c.Chapter.Story.Title, c.Chapter.Number,
                db.CommentReports.Count(r => r.CommentId == c.Id), c.CreatedAt))
            .ToListAsync();
        return new PagedResult<AdminCommentDto>(items, q.Page, q.PageSize, total, (int)Math.Ceiling(total / (double)q.PageSize));
    }

    public async Task SetHiddenAsync(int commentId, bool hidden)
    {
        var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == commentId)
            ?? throw new NotFoundException("Không tìm thấy bình luận");
        comment.IsHidden = hidden;
        if (hidden) await ResolvePendingAsync(commentId, ReportStatus.Resolved);
        else await db.SaveChangesAsync();
    }

    // ---------- Xử lý chung ----------

    private record CommentRow(int Id, int? ParentId, int UserId, string DisplayName, string? AvatarUrl, string Content, bool IsHidden, DateTime CreatedAt);

    private static void EnsureCanPost(User user)
    {
        if (user.Status == UserStatus.Restricted)
            throw new ForbiddenException("Tài khoản của bạn đang bị hạn chế, không thể bình luận hoặc báo cáo" +
                                         (string.IsNullOrWhiteSpace(user.StatusReason) ? "" : $". Lý do: {user.StatusReason}"));
        if (user.Status == UserStatus.Suspended)
            throw new ForbiddenException("Tài khoản đã bị tạm ngừng");
    }

    private async Task ResolvePendingAsync(int commentId, ReportStatus status)
    {
        var pending = await db.CommentReports.Where(r => r.CommentId == commentId && r.Status == ReportStatus.Pending).ToListAsync();
        foreach (var r in pending) r.Status = status;
        await db.SaveChangesAsync();
    }

    /// <summary>Xóa bình luận cùng các câu trả lời và báo cáo liên quan</summary>
    private async Task RemoveCommentAsync(int commentId)
    {
        var ids = await db.Comments.Where(c => c.Id == commentId || c.ParentId == commentId).Select(c => c.Id).ToListAsync();
        await using var tx = await db.Database.BeginTransactionAsync();
        await db.CommentReports.Where(r => ids.Contains(r.CommentId)).ExecuteDeleteAsync();
        await db.Comments.Where(c => c.ParentId == commentId).ExecuteDeleteAsync();
        await db.Comments.Where(c => c.Id == commentId).ExecuteDeleteAsync();
        await tx.CommitAsync();
    }
}
