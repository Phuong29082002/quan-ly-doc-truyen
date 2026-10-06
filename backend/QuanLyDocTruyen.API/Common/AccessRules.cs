using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Common;

/// <summary>
/// Quy tắc chương miễn phí. Sprint 2 (PB22) sẽ bổ sung kiểm tra gói đọc và truyện đã mua.
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
}
