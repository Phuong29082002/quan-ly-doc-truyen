using System.ComponentModel.DataAnnotations;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.DTOs;

// ---------- Thanh toán (PB19, PB20, PB21, PB23, PB45) ----------

/// <summary>Cổng thanh toán: "Mock" = cổng giả lập để demo, "VNPay" = VNPay Sandbox, "BankQR" = chuyển khoản quét mã VietQR</summary>
public class PackagePaymentRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Vui lòng chọn gói đọc")]
    public int PackageId { get; set; }

    public string Provider { get; set; } = "Mock";
}

public class StoryPaymentRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Vui lòng chọn truyện")]
    public int StoryId { get; set; }

    public string Provider { get; set; } = "Mock";
}

/// <summary>PaymentUrl: link sang VNPay (null nếu dùng cổng giả lập, client tự mở màn hình thanh toán giả lập)</summary>
public record PaymentStartDto(int TransactionId, string Provider, string? PaymentUrl);

public class MockPaymentResultRequest
{
    public bool Success { get; set; }
}

public record PaymentProvidersDto(bool Mock, bool VnPay, bool BankQr);

public record TransactionDto(
    int Id,
    TransactionType Type,
    TransactionStatus Status,
    decimal Amount,
    int? PackageId,
    string? PackageName,
    int? StoryId,
    string? StoryTitle,
    DateTime CreatedAt,
    DateTime? PaidAt,
    // Gia hạn gói (đã có gói này còn hạn lúc thanh toán)
    bool IsRenewal,
    // Gói hết hạn sau giao dịch này (chỉ có với giao dịch gói thành công)
    DateTime? PackageEndAt,
    // Purchase = đăng ký mới, Renew = gia hạn, Switch = chuyển gói, Restore = khôi phục gói bảo lưu
    string? PackageMode);

/// <summary>Thông tin chuyển khoản: QrImageUrl là ảnh mã VietQR đã điền sẵn số tiền và nội dung</summary>
public record BankQrDto(
    int TransactionId,
    string QrImageUrl,
    string BankName,
    string AccountNo,
    string AccountName,
    decimal Amount,
    string TransferContent,
    DateTime ExpiresAt,
    TransactionStatus Status);

/// <summary>Dữ liệu SePay gửi sang khi tài khoản có biến động số dư</summary>
public class SePayWebhookRequest
{
    public long Id { get; set; }
    public string? Gateway { get; set; }
    public string? AccountNumber { get; set; }
    public string? Content { get; set; }
    public string? TransferType { get; set; }
    public decimal TransferAmount { get; set; }
    public string? ReferenceCode { get; set; }
}

// ---------- Tủ sách của tôi (PB25) ----------

/// <summary>IsPaused: gói bị tạm dừng khi chuyển sang gói khác, RemainingDays: số ngày được bảo lưu để khôi phục</summary>
public record MyPackageDto(int Id, int PackageId, string PackageName, PackageScope Scope, DateTime StartAt, DateTime EndAt,
    bool IsActive, bool IsPaused, int RemainingDays);

public record MyPurchaseDto(int StoryId, string StoryTitle, string? CoverUrl, decimal Price, DateTime PurchasedAt);

public record MyLibraryDto(List<MyPackageDto> Packages, List<MyPurchaseDto> Purchases);

// ---------- Admin: giao dịch, đối soát (PB24) ----------

public class AdminTransactionQuery
{
    public TransactionStatus? Status { get; set; }

    /// <summary>true = chỉ lấy giao dịch thành công nhưng chưa cấp quyền đọc</summary>
    public bool MissingRights { get; set; }

    public string? Keyword { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}

public record AdminTransactionDto(
    int Id,
    int UserId,
    string Username,
    string DisplayName,
    TransactionType Type,
    TransactionStatus Status,
    decimal Amount,
    string? ItemName,
    DateTime CreatedAt,
    DateTime? PaidAt,
    // Thành công nhưng chưa có quyền đọc tương ứng
    bool MissingRights,
    // Nội dung chuyển khoản để đối chiếu với sao kê ngân hàng
    string TransferContent);

public class AdminConfirmRequest
{
    public bool Received { get; set; }
}

// ---------- Tiến độ đọc (PB26, PB27) ----------

public class ReadingProgressRequest
{
    [Range(1, int.MaxValue)]
    public int StoryId { get; set; }

    [Range(1, int.MaxValue)]
    public int ChapterNumber { get; set; }

    /// <summary>Vị trí cuộn trong chương, 0 = đầu chương, 1 = cuối chương</summary>
    [Range(0, 1)]
    public double Position { get; set; }
}

public record ReadingProgressDto(int StoryId, int ChapterNumber, string ChapterTitle, double Position, DateTime UpdatedAt);

public record ReadingItemDto(
    int StoryId,
    string StoryTitle,
    string Author,
    string? CoverUrl,
    int ChapterNumber,
    string ChapterTitle,
    int TotalChapters,
    double Position,
    DateTime UpdatedAt);
