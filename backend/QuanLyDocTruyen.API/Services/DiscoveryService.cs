using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

// ---------- PB49: đánh giá sao ----------

public interface IRatingService
{
    Task<RatingSummaryDto> GetAsync(int storyId, int? userId);
    Task<RatingSummaryDto> RateAsync(int userId, int storyId, int score);
    Task<RatingSummaryDto> RemoveAsync(int userId, int storyId);
}

public class RatingService(AppDbContext db) : IRatingService
{
    public async Task<RatingSummaryDto> GetAsync(int storyId, int? userId)
    {
        if (!await db.Stories.AnyAsync(s => s.Id == storyId))
            throw new NotFoundException("Không tìm thấy truyện");

        var counts = await db.Ratings.Where(r => r.StoryId == storyId)
            .GroupBy(r => r.Score)
            .Select(g => new { Score = g.Key, Count = g.Count() })
            .ToListAsync();

        var distribution = new int[5];
        foreach (var c in counts) distribution[c.Score - 1] = c.Count;
        var total = distribution.Sum();
        var average = total == 0 ? 0 : Math.Round(counts.Sum(c => c.Score * c.Count) / (double)total, 2);

        int? mine = userId is int uid
            ? await db.Ratings.Where(r => r.StoryId == storyId && r.UserId == uid).Select(r => (int?)r.Score).FirstOrDefaultAsync()
            : null;

        return new RatingSummaryDto(storyId, average, total, distribution, mine);
    }

    public async Task<RatingSummaryDto> RateAsync(int userId, int storyId, int score)
    {
        if (score is < 1 or > 5) throw new BadRequestException("Điểm đánh giá từ 1 đến 5 sao");
        var story = await db.Stories.FirstOrDefaultAsync(s => s.Id == storyId)
            ?? throw new NotFoundException("Không tìm thấy truyện");

        var rating = await db.Ratings.FirstOrDefaultAsync(r => r.StoryId == storyId && r.UserId == userId);
        if (rating is null)
            db.Ratings.Add(new Rating { UserId = userId, StoryId = storyId, Score = score });
        else
        {
            rating.Score = score;
            rating.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        await RefreshStoryAsync(story);
        return await GetAsync(storyId, userId);
    }

    public async Task<RatingSummaryDto> RemoveAsync(int userId, int storyId)
    {
        var story = await db.Stories.FirstOrDefaultAsync(s => s.Id == storyId)
            ?? throw new NotFoundException("Không tìm thấy truyện");
        await db.Ratings.Where(r => r.StoryId == storyId && r.UserId == userId).ExecuteDeleteAsync();
        await RefreshStoryAsync(story);
        return await GetAsync(storyId, userId);
    }

    // Lưu sẵn điểm trung bình trên bảng Story để danh sách, xếp hạng không phải tính lại
    private async Task RefreshStoryAsync(Story story)
    {
        var agg = await db.Ratings.Where(r => r.StoryId == story.Id)
            .GroupBy(r => 1)
            .Select(g => new { Count = g.Count(), Avg = g.Average(r => (double)r.Score) })
            .FirstOrDefaultAsync();
        story.RatingCount = agg?.Count ?? 0;
        story.RatingAverage = agg is null ? 0 : Math.Round(agg.Avg, 2);
        await db.SaveChangesAsync();
    }
}

// ---------- PB49: bảng xếp hạng ngày / tuần / tháng ----------

public interface IRankingService
{
    Task<List<RankingItemDto>> GetAsync(RankingQuery q);
}

public class RankingService(AppDbContext db) : IRankingService
{
    public async Task<List<RankingItemDto>> GetAsync(RankingQuery q)
    {
        var now = DateTime.UtcNow;
        DateTime? since = q.Period switch
        {
            "day" => now.AddDays(-1),
            "week" => now.AddDays(-7),
            "month" => now.AddDays(-30),
            _ => null
        };
        var limit = Math.Clamp(q.Limit, 1, 50);

        List<(int StoryId, double Value)> scores;
        switch (q.Type)
        {
            case "rating":
                // Xếp theo điểm có trọng số để truyện 1 lượt 5 sao không vượt truyện 50 lượt 4.8 sao
                scores = (await db.Stories.AsNoTracking()
                        .Where(s => s.RatingCount > 0)
                        .OrderByDescending(s => (s.RatingAverage * s.RatingCount + 3.5 * 5) / (s.RatingCount + 5))
                        .ThenByDescending(s => s.RatingCount)
                        .Take(limit)
                        .Select(s => new { s.Id, s.RatingAverage })
                        .ToListAsync())
                    .Select(x => (x.Id, x.RatingAverage)).ToList();
                break;

            case "follows":
                var follows = db.Follows.AsNoTracking().AsQueryable();
                if (since is DateTime f) follows = follows.Where(x => x.CreatedAt >= f);
                scores = (await follows.GroupBy(x => x.StoryId)
                        .Select(g => new { StoryId = g.Key, Count = g.Count() })
                        .OrderByDescending(x => x.Count)
                        .Take(limit)
                        .ToListAsync())
                    .Select(x => (x.StoryId, (double)x.Count)).ToList();
                break;

            default:
                if (since is DateTime v)
                {
                    scores = (await db.ChapterViews.AsNoTracking()
                            .Where(x => x.ViewedAt >= v)
                            .GroupBy(x => x.StoryId)
                            .Select(g => new { StoryId = g.Key, Count = g.Count() })
                            .OrderByDescending(x => x.Count)
                            .Take(limit)
                            .ToListAsync())
                        .Select(x => (x.StoryId, (double)x.Count)).ToList();
                }
                else
                {
                    scores = (await db.Stories.AsNoTracking()
                            .OrderByDescending(s => s.ViewCount)
                            .Take(limit)
                            .Select(s => new { s.Id, s.ViewCount })
                            .ToListAsync())
                        .Select(x => (x.Id, (double)x.ViewCount)).ToList();
                }
                break;
        }

        var ids = scores.Select(x => x.StoryId).ToList();
        var stories = await db.Stories.AsNoTracking()
            .Where(s => ids.Contains(s.Id))
            .Select(StoryProjection.ListItem(now))
            .ToDictionaryAsync(s => s.Id);

        return scores
            .Where(x => stories.ContainsKey(x.StoryId))
            .Select((x, i) => new RankingItemDto(i + 1, stories[x.StoryId], x.Value))
            .ToList();
    }
}

// ---------- PB50: gợi ý truyện ----------

public interface IRecommendationService
{
    Task<List<RecommendationDto>> ForUserAsync(int? userId, int limit);
    Task<List<RecommendationDto>> SimilarAsync(int storyId, int limit);
}

public class RecommendationService(AppDbContext db) : IRecommendationService
{
    private record StoryGenres(int Id, long Views, double Rating, List<int> Genres);

    private async Task<List<StoryGenres>> LoadCatalogAsync() =>
        (await db.Stories.AsNoTracking()
            .Select(s => new { s.Id, s.ViewCount, s.RatingAverage, Genres = s.StoryGenres.Select(g => g.GenreId).ToList() })
            .ToListAsync())
        .Select(s => new StoryGenres(s.Id, s.ViewCount, s.RatingAverage, s.Genres))
        .ToList();

    /// <summary>
    /// Gợi ý theo sở thích: tính điểm cho từng thể loại từ truyện đã đọc, theo dõi, đã mua và chấm từ 4 sao,
    /// rồi chọn truyện chưa đọc có nhiều thể loại hợp nhất; thêm truyện mà "người đọc truyện bạn đọc cũng đọc".
    /// Chưa có lịch sử thì gợi ý truyện được đọc nhiều và đánh giá cao.
    /// </summary>
    public async Task<List<RecommendationDto>> ForUserAsync(int? userId, int limit)
    {
        limit = Math.Clamp(limit, 1, 24);
        var catalog = await LoadCatalogAsync();
        var genreNames = await db.Genres.AsNoTracking().ToDictionaryAsync(g => g.Id, g => g.Name);

        var weights = new Dictionary<int, double>();
        var seen = new HashSet<int>();
        var coReaders = new Dictionary<int, int>();

        if (userId is int uid)
        {
            var read = await db.ReadingProgresses.Where(r => r.UserId == uid).Select(r => r.StoryId).ToListAsync();
            var followed = await db.Follows.Where(f => f.UserId == uid).Select(f => f.StoryId).ToListAsync();
            var bought = await db.StoryPurchases.Where(p => p.UserId == uid).Select(p => p.StoryId).ToListAsync();
            var liked = await db.Ratings.Where(r => r.UserId == uid && r.Score >= 4).Select(r => r.StoryId).ToListAsync();
            var disliked = await db.Ratings.Where(r => r.UserId == uid && r.Score <= 2).Select(r => r.StoryId).ToListAsync();

            void Add(IEnumerable<int> storyIds, double w)
            {
                foreach (var id in storyIds)
                    foreach (var g in catalog.FirstOrDefault(s => s.Id == id)?.Genres ?? [])
                        weights[g] = weights.GetValueOrDefault(g) + w;
            }
            Add(read, 1);
            Add(followed, 1.5);
            Add(bought, 2);
            Add(liked, 2);
            Add(disliked, -2);
            seen.UnionWith(read);
            seen.UnionWith(followed);
            seen.UnionWith(bought);

            // Người đọc chung: những người cũng đọc truyện bạn đọc thì còn đọc truyện gì
            if (read.Count > 0)
            {
                var others = db.ReadingProgresses.Where(r => r.UserId != uid && read.Contains(r.StoryId)).Select(r => r.UserId).Distinct();
                coReaders = await db.ReadingProgresses
                    .Where(r => others.Contains(r.UserId) && !read.Contains(r.StoryId))
                    .GroupBy(r => r.StoryId)
                    .Select(g => new { StoryId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.StoryId, x => x.Count);
            }
        }

        var maxViews = Math.Max(1, catalog.Count == 0 ? 1 : catalog.Max(s => s.Views));
        var picks = catalog
            .Where(s => !seen.Contains(s.Id))
            .Select(s =>
            {
                var genreScore = s.Genres.Sum(g => weights.GetValueOrDefault(g));
                var co = coReaders.GetValueOrDefault(s.Id);
                var popularity = Math.Log10(1 + s.Views) / Math.Log10(1 + maxViews) + s.Rating / 5;
                var bestGenre = s.Genres.Where(weights.ContainsKey).OrderByDescending(g => weights[g]).FirstOrDefault();
                string reason = co > 0 && co * 2 >= genreScore
                    ? "Người đọc truyện giống bạn cũng đọc"
                    : genreScore > 0 && genreNames.TryGetValue(bestGenre, out var name)
                        ? $"Vì bạn hay đọc {name}"
                        : "Được nhiều người đọc";
                return (s.Id, Score: genreScore * 2 + co * 1.5 + popularity, Reason: reason);
            })
            .OrderByDescending(x => x.Score)
            .Take(limit)
            .ToList();

        return await MaterializeAsync(picks.Select(p => (p.Id, p.Reason)).ToList());
    }

    /// <summary>Truyện tương tự: cùng nhiều thể loại nhất (chỉ số Jaccard), sau đó tới lượt đọc</summary>
    public async Task<List<RecommendationDto>> SimilarAsync(int storyId, int limit)
    {
        limit = Math.Clamp(limit, 1, 24);
        var catalog = await LoadCatalogAsync();
        var current = catalog.FirstOrDefault(s => s.Id == storyId)
            ?? throw new NotFoundException("Không tìm thấy truyện");
        var genreNames = await db.Genres.AsNoTracking().ToDictionaryAsync(g => g.Id, g => g.Name);

        var picks = catalog
            .Where(s => s.Id != storyId)
            .Select(s =>
            {
                var shared = s.Genres.Intersect(current.Genres).ToList();
                var union = s.Genres.Union(current.Genres).Count();
                var jaccard = union == 0 ? 0 : shared.Count / (double)union;
                var reason = shared.Count > 0 ? $"Cùng thể loại {string.Join(", ", shared.Select(g => genreNames.GetValueOrDefault(g, "")))}" : "Được nhiều người đọc";
                return (s.Id, Score: jaccard * 10 + Math.Log10(1 + s.Views) + s.Rating / 5, Reason: reason, Shared: shared.Count);
            })
            .OrderByDescending(x => x.Shared > 0)
            .ThenByDescending(x => x.Score)
            .Take(limit)
            .Select(x => (x.Id, x.Reason))
            .ToList();

        return await MaterializeAsync(picks);
    }

    private async Task<List<RecommendationDto>> MaterializeAsync(List<(int Id, string Reason)> picks)
    {
        var ids = picks.Select(p => p.Id).ToList();
        var stories = await db.Stories.AsNoTracking()
            .Where(s => ids.Contains(s.Id))
            .Select(StoryProjection.ListItem(DateTime.UtcNow))
            .ToDictionaryAsync(s => s.Id);
        return picks.Where(p => stories.ContainsKey(p.Id)).Select(p => new RecommendationDto(stories[p.Id], p.Reason)).ToList();
    }
}
