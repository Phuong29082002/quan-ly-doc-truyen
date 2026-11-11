using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Controllers;

[ApiController]
[Authorize]
[Route("api/payments")]
public class PaymentsController(IPaymentService payments) : ControllerBase
{
    [Authorize(Roles = "Member")]
    [HttpPost("checkout")]
    public async Task<ActionResult<PaymentResultDto>> Checkout(PaymentRequest request)
        => Ok(await payments.PayAsync(User.GetUserId()!.Value, request));

    [Authorize(Roles = "Member")]
    [HttpGet("history")]
    public async Task<ActionResult<PaymentOverviewDto>> History()
        => Ok(await payments.GetOverviewAsync(User.GetUserId()!.Value));

    [Authorize(Roles = "Admin")]
    [HttpGet("reconciliation")]
    public async Task<ActionResult<List<ReconciliationDto>>> Reconciliation()
        => Ok(await payments.GetReconciliationAsync());

    [Authorize(Roles = "Admin")]
    [HttpPost("reconciliation/{transactionId:int}")]
    public async Task<ActionResult<PaymentResultDto>> Reconcile(int transactionId)
        => Ok(await payments.ReconcileAsync(transactionId));
}
