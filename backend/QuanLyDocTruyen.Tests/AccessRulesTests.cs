using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.Tests;

// PB16, PB22: chương miễn phí và quyền đọc chương trả phí
public class AccessRulesTests
{
    [Theory]
    [InlineData(AccessType.Free, 0, 10, false, true)]
    [InlineData(AccessType.Paid, 0, 1, false, false)]
    [InlineData(AccessType.Paid, 0, 1, true, true)]
    [InlineData(AccessType.Mixed, 3, 3, false, true)]
    [InlineData(AccessType.Mixed, 3, 4, false, false)]
    [InlineData(AccessType.Mixed, 3, 8, true, true)]
    public void Free_chapter_rules(AccessType access, int freeCount, int number, bool chapterIsFree, bool expected) =>
        Assert.Equal(expected, AccessRules.IsFreeChapter(access, freeCount, number, chapterIsFree));

    [Fact]
    public async Task Expired_package_gives_no_access()
    {
        using var t = new TestDb();
        var tx = new Transaction { UserId = t.Reader.Id, Type = TransactionType.Package, PackageId = t.Monthly.Id, Amount = 50000, Status = TransactionStatus.Success };
        t.Db.Transactions.Add(tx);
        await t.Db.SaveChangesAsync();
        t.Db.UserPackages.Add(new UserPackage
        {
            UserId = t.Reader.Id, PackageId = t.Monthly.Id, TransactionId = tx.Id,
            StartAt = DateTime.UtcNow.AddDays(-40), EndAt = DateTime.UtcNow.AddDays(-10)
        });
        await t.Db.SaveChangesAsync();

        Assert.Equal(ReadAccess.None, await AccessRules.GetUserAccessAsync(t.Db, t.Reader.Id, t.PaidStory.Id, DateTime.UtcNow));
    }

    [Fact]
    public async Task Selected_package_only_covers_its_stories()
    {
        using var t = new TestDb();
        var tx = new Transaction { UserId = t.Reader.Id, Type = TransactionType.Package, PackageId = t.Selected.Id, Amount = 30000, Status = TransactionStatus.Success };
        t.Db.Transactions.Add(tx);
        await t.Db.SaveChangesAsync();
        t.Db.UserPackages.Add(new UserPackage
        {
            UserId = t.Reader.Id, PackageId = t.Selected.Id, TransactionId = tx.Id,
            StartAt = DateTime.UtcNow.AddDays(-1), EndAt = DateTime.UtcNow.AddDays(29)
        });
        await t.Db.SaveChangesAsync();

        Assert.Equal(ReadAccess.Package, await AccessRules.GetUserAccessAsync(t.Db, t.Reader.Id, t.PaidStory.Id, DateTime.UtcNow));
        Assert.Equal(ReadAccess.None, await AccessRules.GetUserAccessAsync(t.Db, t.Reader.Id, t.OtherStory.Id, DateTime.UtcNow));
    }
}
