using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Entities;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.Tests;

// Xóa truyện trong trang quản trị
public class StoryDeleteTests
{
    private sealed class FakeEnv : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = Path.GetTempPath();
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ApplicationName { get; set; } = "Tests";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = Path.GetTempPath();
        public string EnvironmentName { get; set; } = "Testing";
    }

    [Fact]
    public async Task Deletes_story_with_chapters_comments_follows_and_ratings()
    {
        using var t = new TestDb();
        var story = new Story { Title = "Truyện thử xóa", Author = "Nhóm 3" };
        t.Db.Stories.Add(story);
        await t.Db.SaveChangesAsync();

        var chapter = new Chapter { StoryId = story.Id, Number = 1, Title = "Chương 1", Content = "..." };
        t.Db.Chapters.Add(chapter);
        await t.Db.SaveChangesAsync();

        var root = new Comment { ChapterId = chapter.Id, UserId = t.Reader.Id, Content = "Hay quá" };
        t.Db.Comments.Add(root);
        await t.Db.SaveChangesAsync();
        t.Db.Comments.Add(new Comment { ChapterId = chapter.Id, UserId = t.Reader.Id, ParentId = root.Id, Content = "Đồng ý" });
        t.Db.Follows.Add(new Follow { UserId = t.Reader.Id, StoryId = story.Id });
        t.Db.Ratings.Add(new Rating { UserId = t.Reader.Id, StoryId = story.Id, Score = 5 });
        await t.Db.SaveChangesAsync();

        await new StoryService(t.Db, new FakeEnv()).DeleteAsync(story.Id);

        Assert.False(await t.Db.Stories.AnyAsync(s => s.Id == story.Id));
        Assert.False(await t.Db.Chapters.AnyAsync(c => c.StoryId == story.Id));
        Assert.Equal(0, await t.Db.Comments.CountAsync());
        Assert.False(await t.Db.Follows.AnyAsync(f => f.StoryId == story.Id));
        Assert.False(await t.Db.Ratings.AnyAsync(r => r.StoryId == story.Id));
        // Truyện khác không bị ảnh hưởng
        Assert.True(await t.Db.Stories.AnyAsync(s => s.Id == t.PaidStory.Id));
    }

    [Fact]
    public async Task Cannot_delete_story_that_was_purchased()
    {
        using var t = new TestDb();
        t.Db.StoryPurchases.Add(new StoryPurchase { UserId = t.Reader.Id, StoryId = t.PaidStory.Id, TransactionId = 1, Price = 50000 });
        await t.Db.SaveChangesAsync();

        await Assert.ThrowsAsync<ConflictException>(() => new StoryService(t.Db, new FakeEnv()).DeleteAsync(t.PaidStory.Id));
        Assert.True(await t.Db.Stories.AnyAsync(s => s.Id == t.PaidStory.Id));
    }
}
