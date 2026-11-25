using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

public interface IChatbotService
{
    Task<ChatbotReplyDto> AskAsync(string message, int? userId);
}

/// <summary>
/// PB61: chatbot gợi ý truyện chạy hoàn toàn trên dữ liệu của hệ thống (không gọi dịch vụ bên ngoài).
/// Câu hỏi được bỏ dấu rồi nhận diện: thể loại, tác giả, tên truyện, miễn phí/trả phí, đang ra/hoàn thành,
/// cách sắp xếp (hay nhất, mới nhất, đọc nhiều) và các câu hỏi thường gặp (gói đọc, xu, huy hiệu).
/// </summary>
public partial class ChatbotService(AppDbContext db, IRecommendationService recommendations) : IChatbotService
{
    private const int Take = 5;

    private static readonly List<string> DefaultSuggestions =
    [
        "Truyện trinh thám hay nhất",
        "Truyện miễn phí đã hoàn thành",
        "Truyện mới cập nhật",
        "Gợi ý truyện cho tôi",
        "Gói đọc giá bao nhiêu?"
    ];

    private enum SortBy { Views, Rating, Newest }

    [GeneratedRegex("[^a-z0-9 ]")]
    private static partial Regex NonWord();

    [GeneratedRegex(" {2,}")]
    private static partial Regex Spaces();

    /// <summary>Bỏ dấu, bỏ ký tự đặc biệt, thêm khoảng trắng hai đầu để so khớp theo từ</summary>
    private static string Clean(string? text) =>
        " " + Spaces().Replace(NonWord().Replace(TextSearch.Normalize(text), " "), " ").Trim() + " ";

    private static bool Has(string text, params string[] keys) => keys.Any(k => text.Contains(" " + k + " "));

    public async Task<ChatbotReplyDto> AskAsync(string message, int? userId)
    {
        var text = Clean(message);
        var now = DateTime.UtcNow;

        if (text.Trim().Length == 0)
            return Reply("Bạn muốn đọc truyện gì? Hãy hỏi mình theo thể loại, tác giả hoặc tên truyện nhé.");

        // ----- Chào hỏi -----
        if (Has(text, "xin chao", "chao", "hello", "hi", "alo", "chao ban") && text.Trim().Split(' ').Length <= 4)
            return Reply("Chào bạn! Mình là trợ lý gợi ý truyện. Bạn có thể hỏi kiểu: \"truyện trinh thám hay\", " +
                         "\"truyện miễn phí đã hoàn thành\", \"truyện của tác giả Arthur Conan Doyle\" hoặc \"truyện giống Momotaro\".");

        // ----- Câu hỏi thường gặp -----
        if (Has(text, "goi doc", "gia goi", "bang gia", "bao nhieu tien", "mua goi", "goi thang", "dang ky goi"))
        {
            var packages = await db.Packages.AsNoTracking().Where(p => p.IsActive).OrderBy(p => p.Price).ToListAsync();
            if (packages.Count == 0) return Reply("Hiện chưa có gói đọc nào đang bán.");
            var vi = CultureInfo.GetCultureInfo("vi-VN");
            var lines = packages.Select(p => $"- {p.Name}: {p.Price.ToString("#,0", vi)}đ / {p.DurationDays} ngày" +
                                             (p.Scope == PackageScope.All ? " (tất cả truyện trả phí)" : " (một số truyện chọn sẵn)"));
            return Reply("Các gói đọc đang bán:\n" + string.Join("\n", lines) +
                         "\nBạn vào mục Gói đọc để đăng ký, thanh toán bằng quét mã VietQR hoặc VNPay. Gia hạn khi gói còn hạn sẽ được cộng dồn.");
        }
        if (Has(text, "xu", "diem danh", "nhiem vu", "nap xu"))
            return Reply("Xu dùng để mở khóa từng chương trả phí (5 xu một chương). Bạn nhận xu bằng cách điểm danh mỗi ngày " +
                         "(điểm danh liên tục được thưởng nhiều hơn), làm nhiệm vụ đọc hằng ngày hoặc nạp xu. Xem ở mục Xu và nhiệm vụ.");
        if (Has(text, "huy hieu", "chuoi ngay", "streak", "thanh tich"))
            return Reply("Mỗi ngày bạn đọc ít nhất một chương thì chuỗi ngày đọc tăng thêm 1. Đọc đủ số chương hoặc giữ chuỗi đủ dài " +
                         "sẽ mở khóa huy hiệu như Mọt sách, Khởi động... Xem ở mục Huy hiệu.");
        if (Has(text, "quen mat khau", "doi mat khau", "lay lai mat khau"))
            return Reply("Ở màn hình đăng nhập, bấm \"Quên mật khẩu\", nhập email để nhận mã OTP rồi đặt mật khẩu mới.");

        var genres = await db.Genres.AsNoTracking().Select(g => new { g.Id, g.Name }).ToListAsync();
        var stories = await db.Stories.AsNoTracking().Select(s => new { s.Id, s.Title, s.Author }).ToListAsync();

        // ----- Truyện tương tự ("giống ...", "tương tự ...") -----
        // Khớp cả tên đầy đủ lẫn phần trước dấu ":" hoặc "," ("Sherlock Holmes: Vụ Bê Bối..." -> "sherlock holmes")
        var mentioned = stories
            .Select(s => new { s.Id, s.Title, Keys = TitleKeys(s.Title) })
            .Where(s => s.Keys.Any(k => text.Contains(" " + k + " ")))
            .OrderByDescending(s => s.Keys.Where(k => text.Contains(" " + k + " ")).Max(k => k.Length))
            .FirstOrDefault();
        if (mentioned != null && Has(text, "giong", "tuong tu", "nhu", "kieu"))
        {
            var similar = await recommendations.SimilarAsync(mentioned.Id, Take);
            return similar.Count == 0
                ? Reply($"Mình chưa tìm được truyện giống \"{mentioned.Title}\".")
                : Reply($"Nếu bạn thích \"{mentioned.Title}\", thử đọc những truyện này:", similar.Select(r => r.Story).ToList());
        }

        // ----- Hỏi trực tiếp tên một truyện -----
        if (mentioned != null)
        {
            var one = await db.Stories.AsNoTracking().Where(s => s.Id == mentioned.Id)
                .Select(StoryProjection.ListItem(now)).ToListAsync();
            var s0 = one[0];
            var access = s0.AccessType switch
            {
                AccessType.Free => "đọc miễn phí",
                AccessType.Paid => "cần gói đọc hoặc mua truyện",
                _ => "đọc miễn phí vài chương đầu"
            };
            var status = s0.Status == StoryStatus.Completed ? "đã hoàn thành" : "đang ra";
            return Reply($"\"{s0.Title}\" của {s0.Author}: {s0.ChapterCount} chương, {status}, {access}. Bấm vào truyện để xem chi tiết.", one);
        }

        // ----- Lọc theo thể loại, tác giả, giá, tình trạng -----
        var genreHits = genres.Where(g => text.Contains(" " + Clean(g.Name).Trim() + " ")).ToList();
        var author = stories.Select(s => s.Author).Distinct()
            .Where(a => a.Length >= 4 && text.Contains(" " + Clean(a).Trim() + " "))
            .OrderByDescending(a => a.Length).FirstOrDefault();
        bool? free = Has(text, "mien phi", "free", "khong mat tien", "khong ton phi") ? true
            : Has(text, "tra phi", "vip", "co phi") ? false : null;
        StoryStatus? status1 = Has(text, "hoan thanh", "full", "tron bo", "da xong", "ket thuc") ? StoryStatus.Completed
            : Has(text, "dang ra", "chua hoan thanh", "dang cap nhat") ? StoryStatus.Ongoing : null;
        SortBy? sort = Has(text, "hay nhat", "danh gia cao", "hay", "top", "nhieu sao") ? SortBy.Rating
            : Has(text, "moi", "moi nhat", "moi cap nhat", "vua ra", "cap nhat") ? SortBy.Newest
            : Has(text, "doc nhieu", "hot", "noi tieng", "pho bien", "nhieu nguoi doc") ? SortBy.Views : null;

        var hasFilter = genreHits.Count > 0 || author != null || free != null || status1 != null || sort != null;

        // ----- Không có tiêu chí: "gợi ý cho tôi", "nên đọc gì" hoặc câu chưa hiểu -----
        if (!hasFilter)
        {
            var picks = await recommendations.ForUserAsync(userId, Take);
            var understood = Has(text, "goi y", "de xuat", "nen doc", "doc gi", "truyen gi", "truyen hay", "gioi thieu");
            var intro = understood
                ? (userId != null ? "Dựa trên những truyện bạn đã đọc, mình gợi ý:" : "Đây là các truyện đang được đọc nhiều:")
                : "Mình chưa hiểu rõ câu hỏi. Bạn có thể hỏi theo thể loại, tác giả, truyện miễn phí hay đã hoàn thành. Trong lúc đó, thử mấy truyện này nhé:";
            return Reply(intro, picks.Select(p => p.Story).ToList());
        }

        IQueryable<Story> Query(bool useGenre, bool useAuthor, bool useFree, bool useStatus)
        {
            var q = db.Stories.AsNoTracking().Where(s => s.Chapters.Any(c => c.PublishAt <= now));
            if (useGenre && genreHits.Count > 0)
            {
                var ids = genreHits.Select(g => g.Id).ToList();
                q = q.Where(s => s.StoryGenres.Any(g => ids.Contains(g.GenreId)));
            }
            if (useAuthor && author != null) q = q.Where(s => s.Author == author);
            if (useFree && free == true) q = q.Where(s => s.AccessType == AccessType.Free);
            if (useFree && free == false) q = q.Where(s => s.AccessType != AccessType.Free);
            if (useStatus && status1 != null) q = q.Where(s => s.Status == status1);
            return sort switch
            {
                SortBy.Rating => q.OrderByDescending(s => s.RatingAverage).ThenByDescending(s => s.RatingCount).ThenByDescending(s => s.ViewCount),
                SortBy.Newest => q.OrderByDescending(s => s.UpdatedAt),
                _ => q.OrderByDescending(s => s.ViewCount)
            };
        }

        var found = await Query(true, true, true, true).Take(Take).Select(StoryProjection.ListItem(now)).ToListAsync();

        var parts = new List<string>();
        if (genreHits.Count > 0) parts.Add("thể loại " + string.Join(", ", genreHits.Select(g => g.Name)));
        if (author != null) parts.Add("của " + author);
        if (free == true) parts.Add("miễn phí");
        if (free == false) parts.Add("trả phí");
        if (status1 == StoryStatus.Completed) parts.Add("đã hoàn thành");
        if (status1 == StoryStatus.Ongoing) parts.Add("đang ra");
        var order = sort switch
        {
            SortBy.Rating => "đánh giá cao nhất",
            SortBy.Newest => "mới cập nhật",
            _ => "đọc nhiều nhất"
        };
        var criteria = parts.Count > 0 ? " " + string.Join(", ", parts) : "";

        if (found.Count > 0)
            return Reply($"Đây là {found.Count} truyện{criteria}, xếp theo {order}:", found);

        // Không có truyện khớp hết: nới điều kiện, chỉ giữ thể loại hoặc tác giả
        var relaxed = await Query(true, true, false, false).Take(Take).Select(StoryProjection.ListItem(now)).ToListAsync();
        if (relaxed.Count == 0)
            relaxed = await Query(false, false, false, false).Take(Take).Select(StoryProjection.ListItem(now)).ToListAsync();
        return Reply($"Chưa có truyện nào{criteria}. Bạn xem thử những truyện gần đúng này nhé:", relaxed);
    }

    private static List<string> TitleKeys(string title)
    {
        var keys = new List<string> { Clean(title).Trim() };
        var cut = title.IndexOfAny([':', ',', '-']);
        if (cut >= 6) keys.Add(Clean(title[..cut]).Trim());
        return keys.Where(k => k.Length >= 3).Distinct().ToList();
    }

    private static ChatbotReplyDto Reply(string text, List<StoryListItemDto>? stories = null) =>
        new(text, stories ?? [], DefaultSuggestions);
}
