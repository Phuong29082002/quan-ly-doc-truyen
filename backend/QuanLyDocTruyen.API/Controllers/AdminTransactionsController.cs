using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Controllers;

// PB24: Admin xem giao dịch và đối soát giao dịch thành công nhưng chưa cấp quyền đọc
[ApiController]
[Route("api/admin/transactions")]
[Authorize(Roles = "Admin")]
public class AdminTransactionsController(IPaymentService payments) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<AdminTransactionDto>>> Search([FromQuery] AdminTransactionQuery q)
        => Ok(await payments.GetAdminTransactionsAsync(q));

    // Chuyển khoản QR: Admin thấy tiền về tài khoản thì xác nhận (received = true) hoặc hủy (false)
    [HttpPost("{id:int}/confirm")]
    public async Task<ActionResult<AdminTransactionDto>> Confirm(int id, AdminConfirmRequest req)
        => Ok(await payments.AdminConfirmAsync(id, req.Received));

    [HttpPost("{id:int}/grant")]
    public async Task<ActionResult<AdminTransactionDto>> Grant(int id)
        => Ok(await payments.GrantMissingRightsAsync(id));
}
