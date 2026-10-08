using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Common;

/// <summary>Nguồn quyền đọc của một người dùng đối với một truyện</summary>
public enum ReadAccess { None, Package, Purchased }

/// <summary>
/// Quy tắc quyền đọc (PB16, PB22): chương miễn phí theo chính sách truyện,
/// hoặc người dùng có gói đọc còn hạn bao phủ truyện, hoặc đã mua riêng truyện.
/// </summary>
public static class AccessRules
{
    public static bool IsFreeChapter(AccessType storyAccess, int freeChapterCount, int chapterNumber, bool chapterIsFree) =>
        storyAccess switch
        {
            AccessType.Free => true,
            AccessType.Mixed => chapterIsFree || chapterNumber <= freeChapterCount,
            _ => chapterIsFree
        };

    /// <summary>
    /// Quyền đọc trả phí của người dùng với truyện. Truyện đã mua giữ quyền vĩnh viễn (kể cả khi gói hết hạn);
    /// gói đã ngừng bán nhưng người dùng còn hạn vẫn được tính.
    /// </summary>
    public static async Task<ReadAccess> GetUserAccessAsync(AppDbContext db, int userId, int storyId, DateTime now)
    {
        if (await db.StoryPurchases.AnyAsync(p => p.UserId == userId && p.StoryId == storyId))
            return ReadAccess.Purchased;

        var hasPackage = await db.UserPackages.AnyAsync(up =>
            up.UserId == userId &&
            up.StartAt <= now && up.EndAt > now &&
            (up.Package.Scope == PackageScope.All || up.Package.PackageStories.Any(ps => ps.StoryId == storyId)));

        return hasPackage ? ReadAccess.Package : ReadAccess.None;
    }
}