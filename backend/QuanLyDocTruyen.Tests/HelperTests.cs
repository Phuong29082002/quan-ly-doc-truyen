using System.IO.Compression;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;
using QuanLyDocTruyen.API.Common;

namespace QuanLyDocTruyen.Tests;

// PB51: tìm kiếm không dấu
public class TextSearchTests
{
    [Theory]
    [InlineData("Vụ Án Phòng Số 7", "vu an phong so 7")]
    [InlineData("  Đêm   Trăng  ", "dem trang")]
    [InlineData("KIẾM KHÁCH", "kiem khach")]
    [InlineData(null, "")]
    public void Normalize_removes_vietnamese_marks(string? input, string expected) =>
        Assert.Equal(expected, TextSearch.Normalize(input));

    [Fact]
    public void Story_search_text_contains_title_and_author() =>
        Assert.Contains("nguyen nhat anh", TextSearch.ForStory("Mắt Biếc", "Nguyễn Nhật Ánh"));
}

// PB45: chữ ký VNPay
public class VnPayHelperTests
{
    private static readonly VnPayOptions Options = new() { TmnCode = "TESTCODE", HashSecret = "SECRETKEY123" };

    private static IQueryCollection QueryOf(string url) => new QueryCollection(QueryHelpers.ParseQuery(new Uri(url).Query));

    [Fact]
    public void Created_payment_url_has_a_valid_signature()
    {
        var url = VnPayHelper.CreatePaymentUrl(Options, 12, 50000, "Thanh toan goi doc", "http://localhost/ket-qua", "127.0.0.1", DateTime.UtcNow);
        var query = QueryOf(url);

        Assert.Equal("5000000", query["vnp_Amount"].ToString()); // VNPay tính theo đơn vị x100
        Assert.Equal("12", query["vnp_TxnRef"].ToString());
        Assert.True(VnPayHelper.ValidateSignature(Options, query));
    }

    [Fact]
    public void Tampered_amount_fails_signature_check()
    {
        var url = VnPayHelper.CreatePaymentUrl(Options, 12, 50000, "Thanh toan", "http://localhost/ket-qua", "127.0.0.1", DateTime.UtcNow);
        var tampered = url.Replace("vnp_Amount=5000000", "vnp_Amount=100");

        Assert.False(VnPayHelper.ValidateSignature(Options, QueryOf(tampered)));
    }
}

// PB54: file Excel xuất ra đúng cấu trúc .xlsx
public class XlsxWriterTests
{
    [Fact]
    public void Writes_a_valid_workbook_with_escaped_text()
    {
        var bytes = new XlsxWriter()
            .AddSheet("Tổng quan", "Báo cáo", ["Chỉ số", "Giá trị"], [["Doanh thu <đồng> & thuế", 1890000m]])
            .AddSheet("Theo ngày", null, ["Ngày", "Lượt đọc"], [[new DateOnly(2026, 11, 14), 42L]])
            .ToBytes();

        using var zip = new ZipArchive(new MemoryStream(bytes));
        Assert.NotNull(zip.GetEntry("[Content_Types].xml"));
        Assert.NotNull(zip.GetEntry("xl/workbook.xml"));
        Assert.NotNull(zip.GetEntry("xl/worksheets/sheet2.xml"));

        using var reader = new StreamReader(zip.GetEntry("xl/worksheets/sheet1.xml")!.Open());
        var xml = reader.ReadToEnd();
        Assert.Contains("Doanh thu &lt;đồng&gt; &amp; thuế", xml);
        Assert.Contains("<v>1890000</v>", xml);
    }
}
