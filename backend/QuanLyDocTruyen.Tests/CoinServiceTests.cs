using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.Tests;

public class CoinServiceTests
{
    [Fact]
    public async Task CheckIn_FirstTime_GrantsCoins_And_SubsequentTodayFails()
    {
        using var test = new TestDb();
        var coins = new CoinService(test.Db);

        // Ban đầu user có 50 xu chào mừng
        var bal = await coins.GetBalanceAsync(test.Reader.Id);
        Assert.Equal(50, bal.Coins);
        Assert.False(bal.HasCheckedInToday);

        // Điểm danh lần đầu
        var res = await coins.CheckInAsync(test.Reader.Id);
        Assert.True(res.Success);
        Assert.Equal(10, res.CoinsEarned);
        Assert.Equal(60, res.NewBalance);
        Assert.Equal(1, res.ConsecutiveDays);

        // Điểm danh lại trong ngày phải báo lỗi
        await Assert.ThrowsAsync<BadRequestException>(() => coins.CheckInAsync(test.Reader.Id));
    }

    [Fact]
    public async Task UnlockChapter_SufficientCoins_UnlocksSuccessfully()
    {
        using var test = new TestDb();
        var chapter = new Chapter { StoryId = test.PaidStory.Id, Number = 1, Title = "Chương 1", Content = "Nội dung VIP", IsFree = false };
        test.Db.Chapters.Add(chapter);
        await test.Db.SaveChangesAsync();

        var coins = new CoinService(test.Db);

        // Mở khóa bằng 5 xu
        var res = await coins.UnlockChapterAsync(test.Reader.Id, chapter.Id);
        Assert.True(res.Success);
        Assert.Equal(5, res.CoinsSpent);
        Assert.Equal(45, res.NewBalance); // 50 - 5 = 45

        // Kiểm tra quyền đọc
        var canRead = await AccessRules.IsChapterUnlockedWithCoinsAsync(test.Db, test.Reader.Id, chapter.Id);
        Assert.True(canRead);

        // Mở khóa lại không bị trừ xu lần 2
        var resAgain = await coins.UnlockChapterAsync(test.Reader.Id, chapter.Id);
        Assert.True(resAgain.Success);
        Assert.Equal(0, resAgain.CoinsSpent);
        Assert.Equal(45, resAgain.NewBalance);
    }

    [Fact]
    public async Task UnlockChapter_InsufficientCoins_ThrowsBadRequestException()
    {
        using var test = new TestDb();
        test.Reader.Coins = 2; // Chỉ có 2 xu mà giá là 5 xu
        var chapter = new Chapter { StoryId = test.PaidStory.Id, Number = 2, Title = "Chương 2", Content = "Nội dung", IsFree = false };
        test.Db.Chapters.Add(chapter);
        await test.Db.SaveChangesAsync();

        var coins = new CoinService(test.Db);
        await Assert.ThrowsAsync<BadRequestException>(() => coins.UnlockChapterAsync(test.Reader.Id, chapter.Id));
    }

    [Fact]
    public async Task TopUpCoins_ViaMockPayment_CreditsUserCoins()
    {
        using var test = new TestDb();
        var payments = test.Payments(enableMock: true);
        var coins = new CoinService(test.Db);

        // Bắt đầu nạp gói 1 (100 xu, 10.000đ)
        var start = await coins.StartTopUpAsync(test.Reader.Id, new TopUpCoinRequest { PackageId = 1, Provider = "Mock" }, "http://localhost", "127.0.0.1");
        Assert.True(start.TransactionId > 0);

        // Hoàn tất thanh toán Mock thành công
        var complete = await payments.CompleteMockAsync(test.Reader.Id, start.TransactionId, success: true);
        Assert.Equal(TransactionStatus.Success, complete.Status);

        // Kiểm tra số dư xu: 50 + 100 = 150 xu
        var bal = await coins.GetBalanceAsync(test.Reader.Id);
        Assert.Equal(150, bal.Coins);
    }
}
