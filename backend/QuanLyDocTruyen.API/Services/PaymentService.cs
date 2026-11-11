using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Services;

public interface IPaymentService
{
    Task<PaymentResultDto> PayAsync(int userId, PaymentRequest request);
    Task<PaymentOverviewDto> GetOverviewAsync(int userId);
    Task<List<ReconciliationDto>> GetReconciliationAsync();
    Task<PaymentResultDto> ReconcileAsync(int transactionId);
}

public class PaymentService(AppDbContext db) : IPaymentService
{
    public async Task<PaymentResultDto> PayAsync(int userId, PaymentRequest request)
    {
        var type = request.Type.Trim();
        decimal amount;
        Package? package = null;
        Story? story = null;
        var packageMode = (request.PackageMode ?? "Purchase").Trim();
        if (type.Equals("Package", StringComparison.OrdinalIgnoreCase))
        {
            package = await db.Packages.FirstOrDefaultAsync(x => x.Id == request.ItemId && (packageMode == "Restore" || x.IsActive))
                ?? throw new NotFoundException("Gói đọc không tồn tại hoặc đã ngừng bán");
            var now = DateTime.UtcNow;
            var activePackage = await db.UserPackages.Include(x => x.Package).Where(x => x.UserId == userId && !x.IsPaused && x.StartAt <= now && x.EndAt > now).OrderByDescending(x => x.EndAt).FirstOrDefaultAsync();
            var pausedPackage = await db.UserPackages.Include(x => x.Package).Where(x => x.UserId == userId && x.IsPaused && x.RemainingDays > 0 && x.PackageId == package.Id).OrderByDescending(x => x.Id).FirstOrDefaultAsync();
            if (activePackage?.PackageId == package.Id && packageMode != "Renew")
                throw new BadRequestException($"Bạn đang sử dụng gói {package.Name}. Vui lòng chọn Gia hạn nếu muốn mua thêm thời gian.");
            if (activePackage != null && activePackage.PackageId != package.Id && packageMode is not ("Switch" or "Restore"))
                throw new BadRequestException($"Bạn đang sử dụng gói {activePackage.Package.Name}. Vui lòng xác nhận chuyển gói trước khi thanh toán.");
            if (packageMode == "Renew" && (activePackage == null || activePackage.PackageId != package.Id))
                throw new BadRequestException("Chỉ có thể gia hạn gói bạn đang sử dụng.");
            if (packageMode == "Switch" && activePackage?.PackageId == package.Id)
                throw new BadRequestException("Bạn đang sử dụng gói này. Hãy chọn Gia hạn.");
            if (packageMode == "Purchase" && (activePackage != null || pausedPackage != null))
                throw new BadRequestException("Bạn đã có gói đọc. Vui lòng chọn gia hạn hoặc khôi phục gói đã bảo lưu.");
            if (packageMode == "Restore" && pausedPackage == null)
                throw new BadRequestException("Không tìm thấy gói đã tạm dừng còn thời hạn để khôi phục.");
            if (packageMode is not ("Purchase" or "Renew" or "Switch" or "Restore"))
                throw new BadRequestException("Hình thức đăng ký gói không hợp lệ.");
            amount = packageMode == "Restore" ? 0 : package.Price;
            type = "Package";
        }
        else if (type.Equals("Story", StringComparison.OrdinalIgnoreCase))
        {
            story = await db.Stories.FirstOrDefaultAsync(x => x.Id == request.ItemId)
                ?? throw new NotFoundException("Không tìm thấy truyện");
            if (await db.StoryPurchases.AnyAsync(x => x.UserId == userId && x.StoryId == story.Id))
                throw new BadRequestException("Bạn đã sở hữu quyền đọc truyện này");
            amount = story.Price;
            if (amount <= 0) throw new BadRequestException("Truyện này không hỗ trợ mua quyền đọc riêng");
            type = "Story";
        }
        else throw new BadRequestException("Loại giao dịch không hợp lệ");

        await using var scope = await db.Database.BeginTransactionAsync();
        var transaction = new Transaction
        {
            UserId = userId,
            Type = type == "Package" ? TransactionType.Package : TransactionType.Story,
            PackageId = package?.Id,
            StoryId = story?.Id,
            PackageMode = package != null ? packageMode : null,
            Amount = amount,
            Status = packageMode == "Restore" ? TransactionStatus.Success : request.SimulateSuccess ? TransactionStatus.Success : TransactionStatus.Failed,
            CreatedAt = DateTime.UtcNow,
            PaidAt = packageMode == "Restore" || request.SimulateSuccess ? DateTime.UtcNow : null
        };
        db.Transactions.Add(transaction);
        await db.SaveChangesAsync();
        var succeeded = packageMode == "Restore" || request.SimulateSuccess;
        if (succeeded) await GrantEntitlementAsync(transaction);
        await scope.CommitAsync();
        return ToResult(transaction, packageMode == "Restore" ? "Đã khôi phục gói miễn phí bằng số ngày còn bảo lưu" : request.SimulateSuccess ? "Thanh toán thành công, quyền đọc đã được kích hoạt" : "Thanh toán thất bại, quyền đọc chưa được cấp");
    }

    public async Task<PaymentOverviewDto> GetOverviewAsync(int userId)
    {
        var transactions = await db.Transactions.AsNoTracking().Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new PaymentHistoryDto(x.Id, x.Type.ToString(), x.Package != null ? x.Package.Name : x.Story != null ? x.Story.Title : null, x.Amount, x.Status.ToString(), x.CreatedAt, x.PaidAt)).ToListAsync();
        var stories = await db.StoryPurchases.AsNoTracking().Where(x => x.UserId == userId)
            .OrderByDescending(x => x.PurchasedAt).Select(x => new OwnedStoryDto(x.StoryId, x.Story.Title, x.Price, x.PurchasedAt)).ToListAsync();
        var now = DateTime.UtcNow;
        var packageRows = await db.UserPackages.AsNoTracking().Where(x => x.UserId == userId)
            .OrderByDescending(x => x.EndAt).Select(x => new { x.PackageId, PackageName = x.Package.Name, x.StartAt, x.EndAt, x.IsPaused, x.RemainingDays }).ToListAsync();
        var packages = packageRows.Select(x => new ActivePackageDto(x.PackageId, x.PackageName, x.StartAt, x.EndAt, !x.IsPaused && x.StartAt <= now && x.EndAt > now, x.IsPaused, x.IsPaused ? x.RemainingDays : (x.EndAt > now ? (int)Math.Ceiling((x.EndAt - now).TotalDays) : 0))).ToList();
        return new PaymentOverviewDto(transactions, stories, packages);
    }

    public Task<List<ReconciliationDto>> GetReconciliationAsync() => db.Transactions.AsNoTracking()
        .Where(x => x.Status == TransactionStatus.Success &&
            (x.Type == TransactionType.Package && !db.UserPackages.Any(p => p.TransactionId == x.Id) ||
             x.Type == TransactionType.Story && !db.StoryPurchases.Any(p => p.TransactionId == x.Id)))
        .OrderBy(x => x.PaidAt).Select(x => new ReconciliationDto(x.Id, x.UserId, x.User.Username, x.Type.ToString(), x.PackageId, x.StoryId, x.Amount, x.PaidAt!.Value)).ToListAsync();

    public async Task<PaymentResultDto> ReconcileAsync(int transactionId)
    {
        var transaction = await db.Transactions.FirstOrDefaultAsync(x => x.Id == transactionId)
            ?? throw new NotFoundException("Không tìm thấy giao dịch");
        if (transaction.Status != TransactionStatus.Success)
            throw new BadRequestException("Chỉ có thể cấp lại quyền cho giao dịch thành công");
        await using var scope = await db.Database.BeginTransactionAsync();
        await GrantEntitlementAsync(transaction);
        await scope.CommitAsync();
        return ToResult(transaction, "Đã đối soát và cập nhật quyền đọc");
    }

    private async Task GrantEntitlementAsync(Transaction transaction)
    {
        if (transaction.Type == TransactionType.Package)
        {
            if (await db.UserPackages.AnyAsync(x => x.TransactionId == transaction.Id)) return;
            var package = await db.Packages.FirstAsync(x => x.Id == transaction.PackageId);
            var now = DateTime.UtcNow;
            var active = await db.UserPackages.Where(x => x.UserId == transaction.UserId && !x.IsPaused && x.StartAt <= now && x.EndAt > now).OrderByDescending(x => x.EndAt).FirstOrDefaultAsync();
            var mode = transaction.PackageMode ?? "Purchase";
            if (mode == "Renew")
            {
                if (active == null || active.PackageId != package.Id)
                    throw new BadRequestException("Gói đang sử dụng đã thay đổi. Vui lòng tải lại trang và thử lại.");
                active.EndAt = active.EndAt.AddDays(package.DurationDays);
            }
            else if (mode == "Restore")
            {
                var pausedToRestore = await db.UserPackages.Where(x => x.UserId == transaction.UserId && x.PackageId == package.Id && x.IsPaused && x.RemainingDays > 0).OrderByDescending(x => x.Id).FirstOrDefaultAsync()
                    ?? throw new BadRequestException("Gói đã bảo lưu không còn khả dụng để khôi phục.");
                if (active != null)
                {
                    active.RemainingDays = Math.Max(1, (int)Math.Ceiling((active.EndAt - now).TotalDays));
                    active.IsPaused = true;
                }
                var restoredDays = pausedToRestore.RemainingDays;
                pausedToRestore.RemainingDays = 0;
                db.UserPackages.Add(new UserPackage
                {
                    UserId = transaction.UserId,
                    PackageId = package.Id,
                    TransactionId = transaction.Id,
                    StartAt = now,
                    EndAt = now.AddDays(restoredDays)
                });
            }
            else
            {
                if (active != null)
                {
                    if (active.PackageId == package.Id)
                        throw new BadRequestException("Bạn đang sử dụng gói này. Không thể mua chồng gói.");
                    active.RemainingDays = Math.Max(1, (int)Math.Ceiling((active.EndAt - now).TotalDays));
                    active.IsPaused = true;
                }
                db.UserPackages.Add(new UserPackage { UserId = transaction.UserId, PackageId = package.Id, TransactionId = transaction.Id, StartAt = now, EndAt = now.AddDays(package.DurationDays) });
            }
        }
        else
        {
            if (await db.StoryPurchases.AnyAsync(x => x.TransactionId == transaction.Id)) return;
            var story = await db.Stories.FirstAsync(x => x.Id == transaction.StoryId);
            db.StoryPurchases.Add(new StoryPurchase { UserId = transaction.UserId, StoryId = story.Id, TransactionId = transaction.Id, Price = transaction.Amount, PurchasedAt = transaction.PaidAt ?? DateTime.UtcNow });
        }
        await db.SaveChangesAsync();
    }

    private static PaymentResultDto ToResult(Transaction x, string message) => new(x.Id, x.Status.ToString(), x.Amount, x.CreatedAt, x.PaidAt, message);
}
