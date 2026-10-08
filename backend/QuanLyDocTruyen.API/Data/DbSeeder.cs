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
