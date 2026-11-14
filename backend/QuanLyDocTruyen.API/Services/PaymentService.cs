using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

public interface IPaymentService
{
    PaymentProvidersDto GetProviders();

    /// <summary>PB19, PB20: đăng ký hoặc gia hạn gói đọc</summary>
    Task<PaymentStartDto> StartPackageAsync(int userId, PackagePaymentRequest req, string returnUrl, string ipAddress);

    /// <summary>PB21: mua quyền đọc riêng một truyện</summary>
    Task<PaymentStartDto> StartStoryAsync(int userId, StoryPaymentRequest req, string returnUrl, string ipAddress);

    /// <summary>Cổng giả lập: người dùng bấm "Thanh toán thành công" hoặc "Thất bại"</summary>
    Task<TransactionDto> CompleteMockAsync(int userId, int transactionId, bool success);

    /// <summary>PB45: xử lý kết quả VNPay gửi về. Trả về Id giao dịch (null nếu dữ liệu không hợp lệ)</summary>
    Task<(int? TransactionId, string RspCode, string Message)> HandleVnPayAsync(IQueryCollection query);

    Task<TransactionDto> GetAsync(int userId, int transactionId);

    /// <summary>PB25: lịch sử thanh toán của tôi</summary>
    Task<List<TransactionDto>> GetMyTransactionsAsync(int userId);

    /// <summary>PB25: gói đang dùng / đã hết hạn và truyện đã mua</summary>
    Task<MyLibraryDto> GetMyLibraryAsync(int userId);

    /// <summary>PB24: Admin xem giao dịch, lọc giao dịch thành công nhưng chưa cấp quyền</summary>
    Task<PagedResult<AdminTransactionDto>> GetAdminTransactionsAsync(AdminTransactionQuery q);

    /// <summary>PB24: Admin cấp lại quyền đọc cho giao dịch thành công bị thiếu quyền</summary>
    Task<AdminTransactionDto> GrantMissingRightsAsync(int transactionId);

    /// <summary>Chuyển khoản QR: thông tin tài khoản + ảnh mã VietQR của giao dịch</summary>
    Task<BankQrDto> GetBankQrAsync(int userId, int transactionId);

    /// <summary>Admin xác nhận đã nhận được tiền chuyển khoản (true) hoặc hủy giao dịch (false)</summary>
    Task<AdminTransactionDto> AdminConfirmAsync(int transactionId, bool received);

    /// <summary>Webhook SePay: tiền vào tài khoản có nội dung QLDT{id} đủ số tiền thì tự xác nhận</summary>
    Task<bool> HandleSePayAsync(string? authorization, SePayWebhookRequest req);
}

public class PaymentService(
    AppDbContext db,
    IOptions<VnPayOptions> vnPayOptions,
    IOptions<PaymentOptions> paymentOptions,
    IOptions<BankQrOptions> bankQrOptions,
    ILogger<PaymentService> logger) : IPaymentService
{
    private const string Mock = "Mock";
    private const string VnPay = "VNPay";
    private const string BankQr = "BankQR";

    private readonly VnPayOptions _vnPay = vnPayOptions.Value;
    private readonly PaymentOptions _payment = paymentOptions.Value;
    private readonly BankQrOptions _bank = bankQrOptions.Value;

    public PaymentProvidersDto GetProviders() => new(_payment.EnableMock, _vnPay.Enabled, _bank.Enabled);

    public async Task<PaymentStartDto> StartPackageAsync(int userId, PackagePaymentRequest req, string returnUrl, string ipAddress)
    {
        var provider = NormalizeProvider(req.Provider);
        await EnsureUserCanPayAsync(userId);

        var package = await db.Packages.FirstOrDefaultAsync(p => p.Id == req.PackageId)
            ?? throw new NotFoundException("Không tìm thấy gói đọc");
        if (!package.IsActive)
            throw new BadRequestException("Gói đọc này đã ngừng cung cấp");

        // Giá được chốt tại thời điểm tạo giao dịch
        var transaction = new Transaction
        {
            UserId = userId,
            Type = TransactionType.Package,
            PackageId = package.Id,
            Amount = package.Price
        };
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();

        return BuildStart(transaction, provider, $"Thanh toan goi doc {package.Name} - GD {transaction.Id}", returnUrl, ipAddress);
    }

    public async Task<PaymentStartDto> StartStoryAsync(int userId, StoryPaymentRequest req, string returnUrl, string ipAddress)
    {
        var provider = NormalizeProvider(req.Provider);
        await EnsureUserCanPayAsync(userId);

        var story = await db.Stories.FirstOrDefaultAsync(s => s.Id == req.StoryId)
            ?? throw new NotFoundException("Không tìm thấy truyện");
        if (story.AccessType == AccessType.Free || story.Price <= 0)
            throw new BadRequestException("Truyện này miễn phí, không cần mua");

        // Không thu tiền lại nội dung đã mua
        if (await db.StoryPurchases.AnyAsync(p => p.UserId == userId && p.StoryId == story.Id))
            throw new ConflictException("Bạn đã mua truyện này rồi");

        var transaction = new Transaction
        {
            UserId = userId,
            Type = TransactionType.Story,
            StoryId = story.Id,
            Amount = story.Price
        };
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();

        return BuildStart(transaction, provider, $"Mua truyen {story.Title} - GD {transaction.Id}", returnUrl, ipAddress);
    }

    public async Task<TransactionDto> CompleteMockAsync(int userId, int transactionId, bool success)
    {
        if (!_payment.EnableMock)
            throw new BadRequestException("Cổng thanh toán giả lập đang tắt");

        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == transactionId && t.UserId == userId)
            ?? throw new NotFoundException("Không tìm thấy giao dịch");

        await CompleteAsync(transaction, success);
        return await GetAsync(userId, transactionId);
    }

    public async Task<(int? TransactionId, string RspCode, string Message)> HandleVnPayAsync(IQueryCollection query)
    {
        if (!_vnPay.Enabled)
            return (null, "99", "VNPay chưa được cấu hình");
        if (!VnPayHelper.ValidateSignature(_vnPay, query))
            return (null, "97", "Sai chữ ký");
        if (!int.TryParse(query["vnp_TxnRef"].ToString(), out var transactionId))
            return (null, "01", "Không tìm thấy giao dịch");

        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == transactionId);
        if (transaction is null)
            return (null, "01", "Không tìm thấy giao dịch");

        // Số tiền VNPay gửi về đã nhân 100
        if (!long.TryParse(query["vnp_Amount"].ToString(), out var amount) || amount != (long)Math.Round(transaction.Amount * 100))
            return (transactionId, "04", "Số tiền không hợp lệ");

        if (transaction.Status != TransactionStatus.Pending)
            return (transactionId, "02", "Giao dịch đã được xử lý trước đó");

        var success = query["vnp_ResponseCode"].ToString() == "00" && query["vnp_TransactionStatus"].ToString() == "00";
        await CompleteAsync(transaction, success);
        return (transactionId, "00", "Xác nhận thành công");
    }

    public async Task<TransactionDto> GetAsync(int userId, int transactionId)
    {
        var list = await QueryTransactions(db.Transactions.Where(t => t.Id == transactionId && t.UserId == userId));
        return list.FirstOrDefault() ?? throw new NotFoundException("Không tìm thấy giao dịch");
    }

    public Task<List<TransactionDto>> GetMyTransactionsAsync(int userId) =>
        QueryTransactions(db.Transactions.Where(t => t.UserId == userId));

    public async Task<MyLibraryDto> GetMyLibraryAsync(int userId)
    {
        var now = DateTime.UtcNow;

        var packages = await db.UserPackages.AsNoTracking()
            .Where(up => up.UserId == userId)
            .OrderByDescending(up => up.EndAt)
            .Select(up => new MyPackageDto(up.Id, up.PackageId, up.Package.Name, up.Package.Scope,
                up.StartAt, up.EndAt, up.StartAt <= now && up.EndAt > now))
            .ToListAsync();

        var purchases = await db.StoryPurchases.AsNoTracking()
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.PurchasedAt)
            .Select(p => new MyPurchaseDto(p.StoryId, p.Story.Title, p.Story.CoverUrl, p.Price, p.PurchasedAt))
            .ToListAsync();

        return new MyLibraryDto(packages, purchases);
    }

    public async Task<PagedResult<AdminTransactionDto>> GetAdminTransactionsAsync(AdminTransactionQuery q)
    {
        var query = db.Transactions.AsNoTracking().AsQueryable();

        if (q.Status is TransactionStatus status)
            query = query.Where(t => t.Status == status);

        if (q.MissingRights)
            query = query.Where(MissingRightsFilter());

        if (!string.IsNullOrWhiteSpace(q.Keyword))
        {
            var k = q.Keyword.Trim();
            query = query.Where(t => t.User.Username.Contains(k) || t.User.DisplayName.Contains(k) ||
                                     (t.Package != null && t.Package.Name.Contains(k)) ||
                                     (t.Story != null && t.Story.Title.Contains(k)));
        }

        var total = await query.CountAsync();
        var items = await ProjectAdmin(query.OrderByDescending(t => t.CreatedAt).Skip((q.Page - 1) * q.PageSize).Take(q.PageSize))
            .ToListAsync();

        return new PagedResult<AdminTransactionDto>(items, q.Page, q.PageSize, total, (int)Math.Ceiling(total / (double)q.PageSize));
    }

    public async Task<AdminTransactionDto> GrantMissingRightsAsync(int transactionId)
    {
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == transactionId)
            ?? throw new NotFoundException("Không tìm thấy giao dịch");
        if (transaction.Status != TransactionStatus.Success)
            throw new BadRequestException("Chỉ cấp quyền cho giao dịch đã thanh toán thành công");
        if (await HasRightsAsync(transaction))
            throw new ConflictException("Giao dịch này đã có quyền đọc, không cần cấp lại");

        await GrantRightsAsync(transaction, transaction.PaidAt ?? DateTime.UtcNow);
        await db.SaveChangesAsync();
        logger.LogInformation("Admin cấp lại quyền đọc cho giao dịch {TransactionId}", transactionId);

        return await ProjectAdmin(db.Transactions.AsNoTracking().Where(t => t.Id == transactionId)).FirstAsync();
    }

    public async Task<BankQrDto> GetBankQrAsync(int userId, int transactionId)
    {
        if (!_bank.Enabled)
            throw new BadRequestException("Chưa cấu hình tài khoản nhận chuyển khoản");

        var t = await db.Transactions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == transactionId && x.UserId == userId)
            ?? throw new NotFoundException("Không tìm thấy giao dịch");

        var content = BankQrOptions.TransferContent(t.Id);
        var amount = (long)Math.Round(t.Amount);
        // Ảnh mã VietQR (chuẩn NAPAS) tạo qua img.vietqr.io: quét bằng app ngân hàng hoặc MoMo
        var qr = $"https://img.vietqr.io/image/{_bank.BankId}-{_bank.AccountNo}-compact2.png" +
                 $"?amount={amount}&addInfo={Uri.EscapeDataString(content)}&accountName={Uri.EscapeDataString(_bank.AccountName)}";

        return new BankQrDto(t.Id, qr, _bank.BankName, _bank.AccountNo, _bank.AccountName, t.Amount, content,
            t.CreatedAt.AddMinutes(_bank.ExpireMinutes), t.Status);
    }

    public async Task<AdminTransactionDto> AdminConfirmAsync(int transactionId, bool received)
    {
        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == transactionId)
            ?? throw new NotFoundException("Không tìm thấy giao dịch");
        if (transaction.Status != TransactionStatus.Pending)
            throw new BadRequestException("Chỉ xác nhận được giao dịch đang chờ");

        await CompleteAsync(transaction, received);
        logger.LogInformation("Admin {Action} giao dịch {TransactionId}", received ? "xác nhận" : "hủy", transactionId);
        return await ProjectAdmin(db.Transactions.AsNoTracking().Where(t => t.Id == transactionId)).FirstAsync();
    }

    public async Task<bool> HandleSePayAsync(string? authorization, SePayWebhookRequest req)
    {
        if (string.IsNullOrWhiteSpace(_bank.SePayApiKey) ||
            !string.Equals(authorization?.Trim(), $"Apikey {_bank.SePayApiKey}", StringComparison.Ordinal))
            throw new UnauthorizedException("Sai khóa webhook");

        if (!string.Equals(req.TransferType, "in", StringComparison.OrdinalIgnoreCase)) return false;

        var match = System.Text.RegularExpressions.Regex.Match(req.Content ?? "", @"QLDT\s*(\d+)",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (!match.Success || !int.TryParse(match.Groups[1].Value, out var transactionId)) return false;

        var transaction = await db.Transactions.FirstOrDefaultAsync(t => t.Id == transactionId);
        if (transaction is null || transaction.Status != TransactionStatus.Pending) return false;

        if (req.TransferAmount < transaction.Amount)
        {
            logger.LogWarning("Giao dịch {TransactionId} chuyển thiếu tiền: {Paid}/{Amount}", transactionId, req.TransferAmount, transaction.Amount);
            return false;
        }

        await CompleteAsync(transaction, true);
        logger.LogInformation("SePay xác nhận giao dịch {TransactionId}, mã tham chiếu {Ref}", transactionId, req.ReferenceCode);
        return true;
    }

    // ---------- Xử lý chung ----------

    /// <summary>
    /// Chốt kết quả thanh toán. Thành công: cấp quyền đọc trong cùng một lần lưu (PB19, PB21).
    /// Thất bại: chỉ lưu trạng thái Failed, không cấp quyền (PB23). Giao dịch đã xử lý thì bỏ qua.
    /// </summary>
    private async Task CompleteAsync(Transaction transaction, bool success)
    {
        if (transaction.Status != TransactionStatus.Pending) return;

        var now = DateTime.UtcNow;
        if (success)
        {
            transaction.Status = TransactionStatus.Success;
            transaction.PaidAt = now;
            await GrantRightsAsync(transaction, now);
        }
        else
        {
            transaction.Status = TransactionStatus.Failed;
        }

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Gói: nếu đang có gói cùng loại còn hạn thì cộng dồn từ ngày hết hạn hiện tại (PB20).
    /// Truyện: lưu giá tại thời điểm mua; quyền mua không phụ thuộc gói (PB21).
    /// </summary>
    private async Task GrantRightsAsync(Transaction transaction, DateTime paidAt)
    {
        if (transaction.Type == TransactionType.Package && transaction.PackageId is int packageId)
        {
            var package = await db.Packages.FirstAsync(p => p.Id == packageId);
            var currentEnd = await db.UserPackages
                .Where(up => up.UserId == transaction.UserId && up.PackageId == packageId && up.EndAt > paidAt)
                .MaxAsync(up => (DateTime?)up.EndAt);

            var start = currentEnd ?? paidAt;
            db.UserPackages.Add(new UserPackage
            {
                UserId = transaction.UserId,
                PackageId = packageId,
                TransactionId = transaction.Id,
                StartAt = start,
                EndAt = start.AddDays(package.DurationDays)
            });
        }
        else if (transaction.Type == TransactionType.Story && transaction.StoryId is int storyId)
        {
            if (!await db.StoryPurchases.AnyAsync(p => p.UserId == transaction.UserId && p.StoryId == storyId))
            {
                db.StoryPurchases.Add(new StoryPurchase
                {
                    UserId = transaction.UserId,
                    StoryId = storyId,
                    TransactionId = transaction.Id,
                    Price = transaction.Amount,
                    PurchasedAt = paidAt
                });
            }
        }
    }

    private Task<bool> HasRightsAsync(Transaction t) => t.Type == TransactionType.Package
        ? db.UserPackages.AnyAsync(up => up.TransactionId == t.Id)
        : db.StoryPurchases.AnyAsync(p => p.UserId == t.UserId && p.StoryId == t.StoryId);

    // Giao dịch thành công nhưng không có UserPackage / StoryPurchase tương ứng
    private System.Linq.Expressions.Expression<Func<Transaction, bool>> MissingRightsFilter() => t =>
        t.Status == TransactionStatus.Success &&
        ((t.Type == TransactionType.Package && !db.UserPackages.Any(up => up.TransactionId == t.Id)) ||
         (t.Type == TransactionType.Story && !db.StoryPurchases.Any(p => p.UserId == t.UserId && p.StoryId == t.StoryId)));

    private IQueryable<AdminTransactionDto> ProjectAdmin(IQueryable<Transaction> query) =>
        query.Select(t => new AdminTransactionDto(
            t.Id, t.UserId, t.User.Username, t.User.DisplayName, t.Type, t.Status, t.Amount,
            t.Type == TransactionType.Package
                ? (t.Package != null ? t.Package.Name : null)
                : (t.Story != null ? t.Story.Title : null),
            t.CreatedAt, t.PaidAt,
            t.Status == TransactionStatus.Success &&
            ((t.Type == TransactionType.Package && !db.UserPackages.Any(up => up.TransactionId == t.Id)) ||
             (t.Type == TransactionType.Story && !db.StoryPurchases.Any(p => p.UserId == t.UserId && p.StoryId == t.StoryId))),
            "QLDT" + t.Id.ToString()));

    private async Task<List<TransactionDto>> QueryTransactions(IQueryable<Transaction> query)
    {
        var rows = await query.AsNoTracking()
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id, t.Type, t.Status, t.Amount, t.PackageId, t.StoryId, t.CreatedAt, t.PaidAt,
                PackageName = t.Package != null ? t.Package.Name : null,
                StoryTitle = t.Story != null ? t.Story.Title : null,
                Granted = db.UserPackages.Where(up => up.TransactionId == t.Id)
                    .Select(up => new { up.StartAt, up.EndAt }).FirstOrDefault()
            })
            .ToListAsync();

        return rows.Select(r => new TransactionDto(
            r.Id, r.Type, r.Status, r.Amount, r.PackageId, r.PackageName, r.StoryId, r.StoryTitle,
            r.CreatedAt, r.PaidAt,
            // Gia hạn = gói bắt đầu sau thời điểm thanh toán (được cộng dồn vào gói cũ còn hạn)
            r.Granted != null && r.PaidAt != null && r.Granted.StartAt > r.PaidAt.Value.AddMinutes(1),
            r.Granted?.EndAt)).ToList();
    }

    private PaymentStartDto BuildStart(Transaction transaction, string provider, string orderInfo, string returnUrl, string ipAddress)
    {
        if (provider == Mock || provider == BankQr)
            return new PaymentStartDto(transaction.Id, provider, null);

        var url = VnPayHelper.CreatePaymentUrl(_vnPay, transaction.Id, transaction.Amount, orderInfo, returnUrl, ipAddress, DateTime.UtcNow);
        return new PaymentStartDto(transaction.Id, VnPay, url);
    }

    private string NormalizeProvider(string? provider)
    {
        if (string.Equals(provider, BankQr, StringComparison.OrdinalIgnoreCase))
        {
            if (!_bank.Enabled)
                throw new BadRequestException("Chưa cấu hình tài khoản nhận chuyển khoản (BankQr) trên máy chủ");
            return BankQr;
        }

        if (string.Equals(provider, VnPay, StringComparison.OrdinalIgnoreCase))
        {
            if (!_vnPay.Enabled)
                throw new BadRequestException("Chưa cấu hình VNPay (TmnCode, HashSecret) trong appsettings.json");
            return VnPay;
        }

        if (!_payment.EnableMock)
            throw new BadRequestException("Cổng thanh toán giả lập đang tắt");
        return Mock;
    }

    private async Task EnsureUserCanPayAsync(int userId)
    {
        var user = await db.Users.FindAsync(userId) ?? throw new NotFoundException("Không tìm thấy tài khoản");
        if (user.Status == UserStatus.Suspended)
            throw new ForbiddenException("Tài khoản đã bị tạm ngừng");
    }
}
