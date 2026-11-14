using System.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Controllers;

// PB19, PB20, PB21, PB23, PB45: thanh toán gói đọc và mua truyện
[ApiController]
[Route("api/payments")]
public class PaymentsController(IPaymentService payments, IOptions<PaymentOptions> paymentOptions) : ControllerBase
{
    /// <summary>Các cổng thanh toán đang bật</summary>
    [HttpGet("providers")]
    public ActionResult<PaymentProvidersDto> Providers() => Ok(payments.GetProviders());

    /// <summary>Đăng ký hoặc gia hạn gói đọc</summary>
    [Authorize]
    [HttpPost("package")]
    public async Task<ActionResult<PaymentStartDto>> PayPackage(PackagePaymentRequest req)
        => Ok(await payments.StartPackageAsync(User.GetUserId()!.Value, req, VnPayReturnUrl(), ClientIp()));

    /// <summary>Mua quyền đọc riêng một truyện</summary>
    [Authorize]
    [HttpPost("story")]
    public async Task<ActionResult<PaymentStartDto>> PayStory(StoryPaymentRequest req)
        => Ok(await payments.StartStoryAsync(User.GetUserId()!.Value, req, VnPayReturnUrl(), ClientIp()));

    /// <summary>Cổng giả lập: chốt kết quả thanh toán thành công / thất bại</summary>
    [Authorize]
    [HttpPost("{id:int}/mock-result")]
    public async Task<ActionResult<TransactionDto>> MockResult(int id, MockPaymentResultRequest req)
        => Ok(await payments.CompleteMockAsync(User.GetUserId()!.Value, id, req.Success));

    /// <summary>Trạng thái một giao dịch của tôi</summary>
    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<TransactionDto>> Get(int id)
        => Ok(await payments.GetAsync(User.GetUserId()!.Value, id));

    /// <summary>Chuyển khoản QR: thông tin tài khoản + ảnh mã VietQR (số tiền, nội dung điền sẵn)</summary>
    [Authorize]
    [HttpGet("{id:int}/bank-qr")]
    public async Task<ActionResult<BankQrDto>> BankQr(int id)
        => Ok(await payments.GetBankQrAsync(User.GetUserId()!.Value, id));

    /// <summary>SePay báo có tiền vào tài khoản (header Authorization: Apikey ...)</summary>
    [HttpPost("sepay/webhook")]
    public async Task<IActionResult> SePayWebhook(SePayWebhookRequest req)
    {
        var confirmed = await payments.HandleSePayAsync(Request.Headers.Authorization.ToString(), req);
        return Ok(new { success = true, confirmed });
    }

    /// <summary>
    /// VNPay chuyển người dùng về đây sau khi thanh toán. Kiểm tra chữ ký, chốt giao dịch rồi
    /// chuyển sang trang kết quả trên Web; trên điện thoại thì hiện trang báo kết quả để quay lại app.
    /// </summary>
    [HttpGet("vnpay/return")]
    public async Task<IActionResult> VnPayReturn()
    {
        var (transactionId, rspCode, message) = await payments.HandleVnPayAsync(Request.Query);
        var success = rspCode is "00" or "02" && Request.Query["vnp_ResponseCode"].ToString() == "00";

        var userAgent = Request.Headers.UserAgent.ToString();
        if (!userAgent.Contains("Android", StringComparison.OrdinalIgnoreCase) && transactionId is int id)
            return Redirect($"{paymentOptions.Value.WebBaseUrl.TrimEnd('/')}/thanh-toan/ket-qua/{id}");

        var title = transactionId is null ? "Không xác nhận được giao dịch" : success ? "Thanh toán thành công" : "Thanh toán không thành công";
        var detail = transactionId is null ? message : $"Mã giao dịch: {transactionId}";
        var html = $"""
            <!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <title>{WebUtility.HtmlEncode(title)}</title></head>
            <body style="font-family:sans-serif;text-align:center;padding:48px 16px">
            <h2 style="color:{(success ? "#15803d" : "#b91c1c")}">{WebUtility.HtmlEncode(title)}</h2>
            <p>{WebUtility.HtmlEncode(detail)}</p>
            <p>Vui lòng quay lại ứng dụng Đọc Truyện và bấm "Kiểm tra kết quả".</p>
            </body></html>
            """;
        return Content(html, "text/html; charset=utf-8");
    }

    /// <summary>VNPay gọi ngầm (IPN) để báo kết quả, kể cả khi người dùng đóng trình duyệt</summary>
    [HttpGet("vnpay/ipn")]
    public async Task<IActionResult> VnPayIpn()
    {
        var (_, rspCode, message) = await payments.HandleVnPayAsync(Request.Query);
        return Ok(new { RspCode = rspCode, Message = message });
    }

    // Trả về đúng địa chỉ máy chủ mà client đang gọi (localhost trên máy tính, 10.0.2.2 trên emulator)
    private string VnPayReturnUrl() => $"{Request.Scheme}://{Request.Host}/api/payments/vnpay/return";

    private string ClientIp()
    {
        var ip = HttpContext.Connection.RemoteIpAddress;
        if (ip is null) return "127.0.0.1";
        if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();
        return IPAddress.IsLoopback(ip) ? "127.0.0.1" : ip.ToString();
    }
}
