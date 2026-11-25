using QuanLyDocTruyen.API.Entities;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.Tests;

// PB61: chatbot gợi ý truyện
public class ChatbotServiceTests
{
    private static async Task<(TestDb t, ChatbotService bot, Story fairy)> SetupAsync()
    {
        var t = new TestDb();
        var detective = new Genre { Name = "Trinh thám" };
        var fairyGenre = new Genre { Name = "Cổ tích" };
        var fairy = new Story { Title = "Momotaro, Cậu Bé Quả Đào", Author = "Dân gian Nhật Bản", AccessType = AccessType.Free, Status = StoryStatus.Completed };
        t.Db.AddRange(detective, fairyGenre, fairy);
        await t.Db.SaveChangesAsync();

        t.Db.StoryGenres.AddRange(
            new StoryGenre { StoryId = t.PaidStory.Id, GenreId = detective.Id },
            new StoryGenre { StoryId = fairy.Id, GenreId = fairyGenre.Id });
        t.Db.Chapters.AddRange(
            new Chapter { StoryId = t.PaidStory.Id, Number = 1, Title = "Mở đầu", Content = "..." },
            new Chapter { StoryId = fairy.Id, Number = 1, Title = "Quả đào trôi sông", Content = "..." });
        await t.Db.SaveChangesAsync();

        return (t, new ChatbotService(t.Db, new RecommendationService(t.Db)), fairy);
    }

    [Fact]
    public async Task Finds_story_by_genre_without_accents()
    {
        var (t, bot, _) = await SetupAsync();
        using (t)
        {
            var res = await bot.AskAsync("truyen trinh tham hay nhat", null);
            Assert.Contains(res.Stories, s => s.Id == t.PaidStory.Id);
            Assert.Contains("Trinh thám", res.Reply);
        }
    }

    [Fact]
    public async Task Filters_free_and_completed()
    {
        var (t, bot, fairy) = await SetupAsync();
        using (t)
        {
            var res = await bot.AskAsync("Truyện miễn phí đã hoàn thành", null);
            Assert.Single(res.Stories);
            Assert.Equal(fairy.Id, res.Stories[0].Id);
        }
    }

    [Fact]
    public async Task Answers_by_story_title()
    {
        var (t, bot, fairy) = await SetupAsync();
        using (t)
        {
            var res = await bot.AskAsync("momotaro", null);
            Assert.Equal(fairy.Id, Assert.Single(res.Stories).Id);
        }
    }

    [Fact]
    public async Task Lists_packages_for_price_question()
    {
        var (t, bot, _) = await SetupAsync();
        using (t)
        {
            var res = await bot.AskAsync("Gói đọc giá bao nhiêu?", null);
            Assert.Contains("Gói Tháng", res.Reply);
            Assert.Empty(res.Stories);
            Assert.NotEmpty(res.Suggestions);
        }
    }
}
