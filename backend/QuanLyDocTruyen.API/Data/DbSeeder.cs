using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Data;

/// <summary>
/// Tự tạo database (nếu chưa có), tài khoản Admin và dữ liệu mẫu để demo.
/// Chỉ thêm khi bảng còn trống nên chạy lại nhiều lần không bị trùng.
/// </summary>
public static class DbSeeder
{
    public const string AdminUsername = "admin";
    public const string AdminPassword = "Admin@123";

    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var hasher = services.GetRequiredService<IPasswordHasher<User>>();

        await db.Database.MigrateAsync();

        // PB03: tài khoản quản trị mặc định
        if (!await db.Users.AnyAsync(u => u.Role == UserRole.Admin))
        {
            var admin = new User
            {
                Username = AdminUsername,
                Email = "admin@doctruyen.local",
                DisplayName = "Quản trị viên",
                Role = UserRole.Admin
            };
            admin.PasswordHash = hasher.HashPassword(admin, AdminPassword);
            db.Users.Add(admin);
        }

        if (!await db.Genres.AnyAsync())
        {
            string[] names = ["Tiên hiệp", "Kiếm hiệp", "Ngôn tình", "Đô thị", "Huyền huyễn", "Trinh thám", "Học đường", "Hài hước"];
            db.Genres.AddRange(names.Select(n => new Genre { Name = n }));
        }

        await db.SaveChangesAsync();

        if (!await db.Stories.AnyAsync())
        {
            var g = await db.Genres.ToDictionaryAsync(x => x.Name, x => x.Id);
            var now = DateTime.UtcNow;

            db.Stories.AddRange(
                NewStory(
                    "Kiếm Khách Bên Sông Hồng", "Nhóm 3 HUFLIT", StoryStatus.Ongoing,
                    "Một chàng trai làng chài nhặt được thanh kiếm gãy dưới đáy sông, từ đó bước vào giang hồ đầy sóng gió để tìm lại người thầy đã mất tích.",
                    [g["Kiếm hiệp"], g["Huyền huyễn"]], now.AddDays(-20), now.AddDays(-1),
                    ("Thanh kiếm dưới đáy sông", "Sáng sớm, sương còn phủ kín mặt sông. Minh kéo lưới lên và thấy một vật lạ mắc vào mắt lưới: một thanh kiếm gãy, lưỡi đã gỉ nhưng chuôi vẫn còn khắc chữ.\n\nCậu lau sạch lớp bùn, nhìn kỹ dòng chữ nhỏ: \"Người giữ kiếm, giữ lời hứa\". Minh không hiểu, chỉ thấy lòng bồn chồn khó tả."),
                    ("Lão ăn mày ở bến đò", "Buổi chiều, một lão ăn mày ngồi ở bến đò nhìn chằm chằm vào thanh kiếm Minh mang theo.\n\n\"Cậu bé, thứ đó không phải để bán lấy gạo đâu,\" lão nói, giọng khàn khàn. \"Nó đã chờ chủ nhân của mình rất lâu rồi.\""),
                    ("Lên đường", "Đêm ấy Minh không ngủ được. Cậu gói ghém vài bộ quần áo, buộc thanh kiếm gãy sau lưng.\n\nTrước khi đi, cậu quay lại nhìn ngôi nhà nhỏ bên sông một lần cuối rồi bước theo con đường đất dẫn về phía kinh thành.")),

                NewStory(
                    "Mùa Hạ Năm Ấy", "Nhóm 3 HUFLIT", StoryStatus.Completed,
                    "Câu chuyện nhẹ nhàng về tình bạn và những rung động đầu đời của hai học sinh cuối cấp trong mùa hè trước kỳ thi đại học.",
                    [g["Ngôn tình"], g["Học đường"]], now.AddDays(-40), now.AddDays(-5),
                    ("Chỗ ngồi cạnh cửa sổ", "Ngày đầu năm học, An được xếp ngồi cạnh cửa sổ, ngay bên cạnh cậu bạn mới chuyển trường tên Khang.\n\nKhang ít nói, chỉ lặng lẽ cho An mượn cây bút khi bút của cô hết mực."),
                    ("Cơn mưa đầu hạ", "Cơn mưa bất chợt đổ xuống lúc tan trường. An đứng dưới mái hiên, chưa biết làm sao về nhà.\n\nKhang dừng lại, mở chiếc ô xanh và nói nhỏ: \"Đi chung đi, nhà mình cùng đường.\""),
                    ("Lời hẹn sau kỳ thi", "Ngày thi cuối cùng kết thúc. Hai người ngồi trên bậc thềm trường cũ, nhìn những tán phượng đỏ rực.\n\n\"Dù đậu trường nào, mình vẫn gặp nhau ở đây vào mùa hạ năm sau nhé,\" An nói. Khang mỉm cười gật đầu.")),

                NewStory(
                    "Vụ Án Phòng Số 7", "Nhóm 3 HUFLIT", StoryStatus.Ongoing,
                    "Một viên thám tử trẻ điều tra sự biến mất bí ẩn của vị khách ở phòng số 7 trong một khách sạn cũ giữa lòng thành phố.",
                    [g["Trinh thám"], g["Đô thị"]], now.AddDays(-10), now.AddDays(-2),
                    ("Vị khách không trả phòng", "Quản lý khách sạn gọi cho thám tử Huy lúc nửa đêm: vị khách phòng số 7 đã không trả phòng, cửa khóa trái từ bên trong nhưng căn phòng trống không.\n\nTrên bàn chỉ còn một tách cà phê đã nguội và một tờ giấy ghi dãy số lạ."),
                    ("Dãy số trên tờ giấy", "Huy ngồi cả đêm nhìn dãy số. Không phải số điện thoại, cũng không phải số tài khoản.\n\nĐến gần sáng, anh nhận ra đó là giờ khởi hành của những chuyến tàu rời ga thành phố trong ngày hôm qua."))
            );

            await db.SaveChangesAsync();

            // Chương hẹn giờ phát hành 3 ngày sau: chỉ Admin thấy, người đọc chưa thấy
            var story3 = await db.Stories.FirstAsync(s => s.Title == "Vụ Án Phòng Số 7");
            db.Chapters.Add(new Chapter
            {
                StoryId = story3.Id,
                Number = 3,
                Title = "Nhà ga lúc bình minh",
                Content = "Huy đến nhà ga khi trời vừa sáng. Trong đám đông, anh thoáng thấy một bóng người quen thuộc đang đi về phía đường ray số 7.",
                PublishAt = now.AddDays(3)
            });
            await db.SaveChangesAsync();
        }

        await SeedSprint2Async(db, hasher);
        await SeedIllustratedStoryAsync(db);
    }

    /// <summary>
    /// PB43: truyện mẫu có chương xen kẽ chữ và ảnh minh họa. Ảnh nằm trong wwwroot/samples (ảnh tự vẽ, không bản quyền).
    /// Cú pháp chèn ảnh trong nội dung chương: một dòng riêng dạng ![mô tả](đường dẫn ảnh)
    /// </summary>
    private static async Task SeedIllustratedStoryAsync(AppDbContext db)
    {
        const string title = "Chuyến Tàu Đêm Qua Đèo";
        if (await db.Stories.AnyAsync(s => s.Title == title)) return;

        var genreId = await db.Genres.Where(g => g.Name == "Huyền huyễn").Select(g => g.Id).FirstOrDefaultAsync();
        var now = DateTime.UtcNow;
        var story = NewStory(
            title, "Nhóm 3 HUFLIT", StoryStatus.Ongoing,
            "Cô sinh viên Lan lỡ chuyến xe cuối cùng về quê và bước lên một đoàn tàu đêm không có trong lịch chạy. Truyện có tranh minh họa ở mỗi chương.",
            genreId > 0 ? new[] { genreId } : Array.Empty<int>(), now.AddDays(-4), now.AddHours(-1),
            ("Đoàn tàu không có trong lịch",
                "Mười một giờ đêm, sân ga vắng tanh. Lan nhìn bảng giờ tàu lần thứ ba: chuyến cuối đã chạy từ lúc chín giờ.\n\n" +
                "![Đoàn tàu đêm băng qua dãy núi dưới ánh trăng](/samples/tau-dem.jpg)\n\n" +
                "Vậy mà từ phía đèo, một đoàn tàu bốn toa sáng đèn vàng ấm đang chậm rãi tiến vào. Không còi, không tiếng loa thông báo.\n\n" +
                "Cửa toa cuối mở ra ngay trước mặt cô, như thể đang chờ."),
            ("Sân ga lúc hoàng hôn",
                "Lan tỉnh dậy khi nắng chiều đã nhuộm cam cả bầu trời. Đoàn tàu dừng ở một sân ga nhỏ cô chưa từng thấy trên bản đồ.\n\n" +
                "![Nhà ga nhỏ lúc hoàng hôn, cột đèn vừa bật sáng](/samples/san-ga.jpg)\n\n" +
                "Kỳ lạ là cô nhớ rất rõ mình lên tàu lúc nửa đêm. Ông soát vé già mỉm cười: \"Ở tuyến này, thời gian chạy theo ý của hành khách.\""),
            ("Cây cầu qua rừng thông",
                "Sáng hôm sau, đoàn tàu men theo sườn núi rồi lăn bánh lên một cây cầu đá cong vắt ngang rừng thông.\n\n" +
                "![Cây cầu đá bắc qua rừng thông dưới chân núi](/samples/cau-da.jpg)\n\n" +
                "Lan áp mặt vào cửa kính. Bên dưới, giữa những ngọn thông, cô thấy mái nhà của bà ngoại, nơi cô đã không về suốt ba năm."));
        story.CoverUrl = "/samples/tau-dem.jpg";
        db.Stories.Add(story);
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Dữ liệu mẫu Sprint 2: gói đọc (PB18), truyện kết hợp có chương trả phí (PB16, PB17)
    /// và tài khoản "vip" đã có gói còn hạn để test PB22 khi chưa làm thanh toán (Sprint 3).
    /// </summary>
    private static async Task SeedSprint2Async(AppDbContext db, IPasswordHasher<User> hasher)
    {
        var now = DateTime.UtcNow;

        if (!await db.Packages.AnyAsync())
        {
            var detective = await db.Stories.FirstOrDefaultAsync(s => s.Title == "Vụ Án Phòng Số 7");
            db.Packages.Add(new Package { Name = "Gói Tháng", Price = 49000, DurationDays = 30, Scope = PackageScope.All });
            db.Packages.Add(new Package { Name = "Gói Quý", Price = 129000, DurationDays = 90, Scope = PackageScope.All });
            if (detective is not null)
            {
                db.Packages.Add(new Package
                {
                    Name = "Gói Trinh Thám",
                    Price = 29000,
                    DurationDays = 30,
                    Scope = PackageScope.Selected,
                    PackageStories = [new PackageStory { StoryId = detective.Id }]
                });
            }
            await db.SaveChangesAsync();
        }

        const string paidTitle = "Người Gác Đèn Cuối Cùng";
        if (!await db.Stories.AnyAsync(s => s.Title == paidTitle))
        {
            var genreId = await db.Genres.Where(g => g.Name == "Huyền huyễn").Select(g => g.Id).FirstOrDefaultAsync();
            var story = NewStory(
                paidTitle, "Nhóm 3 HUFLIT", StoryStatus.Ongoing,
                "Trên hòn đảo nhỏ giữa biển, người gác đèn già phát hiện ngọn hải đăng có thể soi thấy những con tàu đến từ quá khứ.",
                genreId > 0 ? new[] { genreId } : Array.Empty<int>(), now.AddDays(-7), now.AddHours(-3),
                ("Ngọn đèn không tắt", "Ông Tư đã gác ngọn hải đăng này bốn mươi năm. Đêm nay, ánh đèn bỗng chuyển sang màu xanh lam, và trên mặt biển hiện ra một con tàu buồm cũ kỹ."),
                ("Con tàu không có thủy thủ", "Con tàu trôi sát vào bờ đá nhưng không hề va chạm. Trên boong không có ai, chỉ có một cuốn nhật ký hàng hải mở sẵn ở trang cuối."),
                ("Trang nhật ký cuối", "Dòng chữ cuối cùng trong nhật ký ghi ngày tháng của năm mươi năm trước, và tên người viết chính là cha của ông Tư."),
                ("Lời nhắn từ quá khứ", "Ông Tư run run lật lại từng trang. Giữa cuốn sổ kẹp một tấm bản đồ đánh dấu một hòn đảo không có trên bất kỳ hải đồ nào."));
            story.AccessType = AccessType.Mixed;
            story.Price = 39000;
            story.FreeChapterCount = 2; // 2 chương đầu miễn phí, chương 3-4 trả phí
            db.Stories.Add(story);
            await db.SaveChangesAsync();
        }

        if (!await db.Users.AnyAsync(u => u.Username == "vip"))
        {
            var monthly = await db.Packages.FirstAsync(p => p.Name == "Gói Tháng");
            var vip = new User { Username = "vip", Email = "vip@doctruyen.local", DisplayName = "Độc giả VIP" };
            vip.PasswordHash = hasher.HashPassword(vip, "123456");
            db.Users.Add(vip);

            var transaction = new Transaction
            {
                User = vip,
                Type = TransactionType.Package,
                PackageId = monthly.Id,
                Amount = monthly.Price,
                Status = TransactionStatus.Success,
                PaidAt = now
            };
            db.Transactions.Add(transaction);
            db.UserPackages.Add(new UserPackage
            {
                User = vip,
                PackageId = monthly.Id,
                Transaction = transaction,
                StartAt = now,
                EndAt = now.AddDays(monthly.DurationDays)
            });
            await db.SaveChangesAsync();
        }
    }

    private static Story NewStory(
        string title, string author, StoryStatus status, string description,
        int[] genreIds, DateTime createdAt, DateTime updatedAt,
        params (string Title, string Content)[] chapters)
    {
        return new Story
        {
            Title = title,
            Author = author,
            Status = status,
            Description = description,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt,
            StoryGenres = genreIds.Select(id => new StoryGenre { GenreId = id }).ToList(),
            Chapters = chapters.Select((c, i) => new Chapter
            {
                Number = i + 1,
                Title = c.Title,
                Content = c.Content,
                PublishAt = createdAt.AddDays(i)
            }).ToList()
        };
    }
}
