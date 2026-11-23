using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.Tests;

// PB19, PB20, PB21, PB23: thanh toán, gia hạn, mua truyện, giao dịch thất bại
public class PaymentServiceTests
{
    private const string ReturnUrl = "http://localhost/ket-qua";

    private static async Task<int> BuyPackage(TestDb t, int packageId, bool success = true)
    {
        var payments = t.Payments();
        var start = await payments.StartPackageAsync(t.Reader.Id, new PackagePaymentRequest { PackageId = packageId, Provider = "Mock" }, ReturnUrl, "127.0.0.1");
        await payments.CompleteMockAsync(t.Reader.Id, start.TransactionId, success);
        return start.TransactionId;
    }

    [Fact]
    public async Task Successful_package_payment_grants_reading_rights()
    {
        using var t = new TestDb();
        var txId = await BuyPackage(t, t.Monthly.Id);

        var tx = await t.Db.Transactions.SingleAsync(x => x.Id == txId);
        Assert.Equal(TransactionStatus.Success, tx.Status);
        Assert.Equal(50000, tx.Amount);
        Assert.Equal("Purchase", tx.PackageMode);

        var access = await AccessRules.GetUserAccessAsync(t.Db, t.Reader.Id, t.PaidStory.Id, DateTime.UtcNow);
        Assert.Equal(ReadAccess.Package, access);
    }

    [Fact]
    public async Task Failed_payment_is_saved_as_failed_and_grants_nothing()
    {
        using var t = new TestDb();
        var txId = await BuyPackage(t, t.Monthly.Id, success: false);

        var tx = await t.Db.Transactions.SingleAsync(x => x.Id == txId);
        Assert.Equal(TransactionStatus.Failed, tx.Status);
        Assert.Null(tx.PaidAt);
        Assert.False(await t.Db.UserPackages.AnyAsync());
        Assert.Equal(ReadAccess.None, await AccessRules.GetUserAccessAsync(t.Db, t.Reader.Id, t.PaidStory.Id, DateTime.UtcNow));
    }

    [Fact]
    public async Task Completing_the_same_transaction_twice_does_not_grant_twice()
    {
        using var t = new TestDb();
        var payments = t.Payments();
        var start = await payments.StartPackageAsync(t.Reader.Id, new PackagePaymentRequest { PackageId = t.Monthly.Id }, ReturnUrl, "127.0.0.1");

        await payments.CompleteMockAsync(t.Reader.Id, start.TransactionId, true);
        await payments.CompleteMockAsync(t.Reader.Id, start.TransactionId, true);
        // Kết quả đã chốt thì báo thất bại sau đó cũng không đổi
        await payments.CompleteMockAsync(t.Reader.Id, start.TransactionId, false);

        Assert.Equal(1, await t.Db.UserPackages.CountAsync());
        Assert.Equal(TransactionStatus.Success, (await t.Db.Transactions.SingleAsync()).Status);
    }

    [Fact]
    public async Task Renewing_an_active_package_adds_time_after_the_current_end()
    {
        using var t = new TestDb();
        await BuyPackage(t, t.Monthly.Id);
        var firstEnd = (await t.Db.UserPackages.SingleAsync()).EndAt;

        var renewId = await BuyPackage(t, t.Monthly.Id);

        var renewal = await t.Db.UserPackages.SingleAsync(x => x.TransactionId == renewId);
        Assert.Equal(firstEnd, renewal.StartAt);
        Assert.Equal(firstEnd.AddDays(30), renewal.EndAt);
        Assert.Equal("Renew", (await t.Db.Transactions.SingleAsync(x => x.Id == renewId)).PackageMode);
    }

    [Fact]
    public async Task Buying_a_different_package_pauses_the_current_one_and_keeps_its_days()
    {
        using var t = new TestDb();
        await BuyPackage(t, t.Monthly.Id);
        var switchId = await BuyPackage(t, t.Selected.Id);

        var monthly = await t.Db.UserPackages.SingleAsync(x => x.PackageId == t.Monthly.Id);
        Assert.True(monthly.IsPaused);
        Assert.InRange(monthly.RemainingDays, 29, 30);
        Assert.Equal("Switch", (await t.Db.Transactions.SingleAsync(x => x.Id == switchId)).PackageMode);

        // Gói đang tạm dừng không cho đọc truyện ngoài phạm vi gói mới
        Assert.Equal(ReadAccess.None, await AccessRules.GetUserAccessAsync(t.Db, t.Reader.Id, t.OtherStory.Id, DateTime.UtcNow));
        Assert.Equal(ReadAccess.Package, await AccessRules.GetUserAccessAsync(t.Db, t.Reader.Id, t.PaidStory.Id, DateTime.UtcNow));
    }

    [Fact]
    public async Task Purchased_story_keeps_its_price_and_cannot_be_bought_again()
    {
        using var t = new TestDb();
        var payments = t.Payments();
        var start = await payments.StartStoryAsync(t.Reader.Id, new StoryPaymentRequest { StoryId = t.PaidStory.Id }, ReturnUrl, "127.0.0.1");
        await payments.CompleteMockAsync(t.Reader.Id, start.TransactionId, true);

        // Admin đổi giá sau khi mua: giá đã mua không đổi
        t.PaidStory.Price = 99000;
        await t.Db.SaveChangesAsync();

        var purchase = await t.Db.StoryPurchases.SingleAsync();
        Assert.Equal(30000, purchase.Price);
        Assert.Equal(ReadAccess.Purchased, await AccessRules.GetUserAccessAsync(t.Db, t.Reader.Id, t.PaidStory.Id, DateTime.UtcNow));

        await Assert.ThrowsAsync<ConflictException>(() =>
            payments.StartStoryAsync(t.Reader.Id, new StoryPaymentRequest { StoryId = t.PaidStory.Id }, ReturnUrl, "127.0.0.1"));
    }

    [Fact]
    public async Task Inactive_package_cannot_be_bought()
    {
        using var t = new TestDb();
        t.Monthly.IsActive = false;
        await t.Db.SaveChangesAsync();

        await Assert.ThrowsAsync<BadRequestException>(() =>
            t.Payments().StartPackageAsync(t.Reader.Id, new PackagePaymentRequest { PackageId = t.Monthly.Id }, ReturnUrl, "127.0.0.1"));
    }

    [Fact]
    public async Task Suspended_account_cannot_pay()
    {
        using var t = new TestDb();
        t.Reader.Status = UserStatus.Suspended;
        await t.Db.SaveChangesAsync();

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            t.Payments().StartPackageAsync(t.Reader.Id, new PackagePaymentRequest { PackageId = t.Monthly.Id }, ReturnUrl, "127.0.0.1"));
    }
}
