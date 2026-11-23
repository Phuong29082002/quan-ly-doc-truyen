using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace QuanLyDocTruyen.API.Common;

/// <summary>Cấu hình VNPay Sandbox (đăng ký tại https://sandbox.vnpayment.vn/devreg/ để nhận TmnCode và HashSecret)</summary>
public class VnPayOptions
{
    public string TmnCode { get; set; } = "";
    public string HashSecret { get; set; } = "";
    public string BaseUrl { get; set; } = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    public bool Enabled => !string.IsNullOrWhiteSpace(TmnCode) && !string.IsNullOrWhiteSpace(HashSecret);
}

/// <summary>
/// Chuyển khoản ngân hàng bằng mã VietQR: quét bằng app ngân hàng hoặc MoMo, tiền chuyển thẳng vào tài khoản.
/// Thông tin tài khoản đặt trong appsettings.Local.json (không đưa lên GitHub).
/// </summary>
public class BankQrOptions
{
    /// <summary>Mã BIN ngân hàng theo chuẩn VietQR, ví dụ Vietcombank = 970436</summary>
    public string BankId { get; set; } = "";
    public string BankName { get; set; } = "";
    public string AccountNo { get; set; } = "";
    public string AccountName { get; set; } = "";
    public int ExpireMinutes { get; set; } = 15;

    /// <summary>Khóa API webhook SePay (tùy chọn). Có khóa thì tiền về là hệ thống tự xác nhận</summary>
    public string SePayApiKey { get; set; } = "";

    public bool Enabled => !string.IsNullOrWhiteSpace(BankId) && !string.IsNullOrWhiteSpace(AccountNo);

    /// <summary>Nội dung chuyển khoản dùng để đối chiếu giao dịch, ví dụ QLDT12</summary>
    public static string TransferContent(int transactionId) => $"QLDT{transactionId}";
}

/// <summary>Cấu hình chung cho thanh toán</summary>
public class PaymentOptions
{
    /// <summary>Bật cổng thanh toán giả lập (dùng khi demo, chưa có tài khoản VNPay)</summary>
    public bool EnableMock { get; set; } = true;

    /// <summary>Địa chỉ trang Web để chuyển người dùng về sau khi thanh toán VNPay</summary>
    public string WebBaseUrl { get; set; } = "http://localhost:5173";
}

/// <summary>
/// PB45: tạo link thanh toán và kiểm tra chữ ký VNPay (phiên bản 2.1.0).
/// Chữ ký = HMAC-SHA512(HashSecret, chuỗi tham số vnp_* sắp xếp theo tên và đã URL-encode).
/// </summary>
public static class VnPayHelper
{
    private static readonly TimeZoneInfo VietnamTime = FindVietnamTimeZone();

    public static string CreatePaymentUrl(VnPayOptions options, int transactionId, decimal amount, string orderInfo,
        string returnUrl, string ipAddress, DateTime utcNow)
    {
        var local = TimeZoneInfo.ConvertTimeFromUtc(utcNow, VietnamTime);
        var data = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Version"] = "2.1.0",
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = options.TmnCode,
            ["vnp_Amount"] = ((long)Math.Round(amount * 100)).ToString(CultureInfo.InvariantCulture),
            ["vnp_CurrCode"] = "VND",
            ["vnp_TxnRef"] = transactionId.ToString(CultureInfo.InvariantCulture),
            ["vnp_OrderInfo"] = orderInfo,
            ["vnp_OrderType"] = "other",
            ["vnp_Locale"] = "vn",
            ["vnp_ReturnUrl"] = returnUrl,
            ["vnp_IpAddr"] = ipAddress,
            ["vnp_CreateDate"] = local.ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture),
            ["vnp_ExpireDate"] = local.AddMinutes(15).ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture)
        };

        var query = BuildQuery(data);
        return $"{options.BaseUrl}?{query}&vnp_SecureHash={Sign(options.HashSecret, query)}";
    }

    /// <summary>Kiểm tra chữ ký của dữ liệu VNPay gửi về (ReturnUrl hoặc IPN)</summary>
    public static bool ValidateSignature(VnPayOptions options, IQueryCollection query)
    {
        var data = new SortedDictionary<string, string>(StringComparer.Ordinal);
        foreach (var pair in query)
        {
            var key = pair.Key;
            var value = pair.Value.ToString();
            if (key.StartsWith("vnp_", StringComparison.Ordinal) &&
                key != "vnp_SecureHash" && key != "vnp_SecureHashType" &&
                !string.IsNullOrEmpty(value))
                data[key] = value;
        }

        var expected = Sign(options.HashSecret, BuildQuery(data));
        var received = query["vnp_SecureHash"].ToString();
        return string.Equals(expected, received, StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildQuery(SortedDictionary<string, string> data) =>
        string.Join("&", data
            .Where(kv => !string.IsNullOrEmpty(kv.Value))
            .Select(kv => $"{WebUtility.UrlEncode(kv.Key)}={WebUtility.UrlEncode(kv.Value)}"));

    private static string Sign(string secret, string data)
    {
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(data))).ToLowerInvariant();
    }

    // Windows dùng "SE Asia Standard Time", Linux/macOS dùng "Asia/Ho_Chi_Minh"
    private static TimeZoneInfo FindVietnamTimeZone()
    {
        foreach (var id in new[] { "Asia/Ho_Chi_Minh", "SE Asia Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }
        return TimeZoneInfo.CreateCustomTimeZone("UTC+07", TimeSpan.FromHours(7), "UTC+07", "UTC+07");
    }
}
