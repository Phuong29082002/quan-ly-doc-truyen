using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.Entities;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.Tests;

/// <summary>CSDL trong bộ nhớ, mỗi bài test một CSDL riêng, dữ liệu mẫu tối thiểu</summary>
public sealed class TestDb : IDisposable
{
    public AppDbContext Db { get; }
    public User Reader { get; }
    public Package Monthly { get; }
    public Package Selected { get; }
    public Story PaidStory { get; }
    public Story OtherStory { get; }

    public TestDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"qldt-{Guid.NewGuid()}")
            .Options;
        Db = new AppDbContext(options);

        Reader = new User { Username = "docgia", Email = "docgia@test.local", DisplayName = "Độc giả", PasswordHash = "x" };
        PaidStory = new Story { Title = "Vụ Án Phòng Số 7", Author = "Tác giả A", AccessType = AccessType.Paid, Price = 30000 };
        OtherStory = new Story { Title = "Truyện Khác", Author = "Tác giả B", AccessType = AccessType.Paid, Price = 20000 };
        Monthly = new Package { Name = "Gói Tháng", Price = 50000, DurationDays = 30, Scope = PackageScope.All };
        Selected = new Package { Name = "Gói Trinh Thám", Price = 30000, DurationDays = 30, Scope = PackageScope.Selected };

        Db.AddRange(Reader, PaidStory, OtherStory, Monthly, Selected);
        Db.SaveChanges();
        Db.PackageStories.Add(new PackageStory { PackageId = Selected.Id, StoryId = PaidStory.Id });
        Db.SaveChanges();
    }

    public PaymentService Payments(bool enableMock = true) => new(
        Db,
        Options.Create(new VnPayOptions()),
        Options.Create(new PaymentOptions { EnableMock = enableMock }),
        Options.Create(new BankQrOptions()),
        NullLogger<PaymentService>.Instance);

    public void Dispose() => Db.Dispose();
}
