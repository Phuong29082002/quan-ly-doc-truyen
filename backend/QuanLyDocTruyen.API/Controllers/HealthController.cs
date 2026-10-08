using Microsoft.AspNetCore.Mvc;
using QuanLyDocTruyen.API.Common;

namespace QuanLyDocTruyen.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok", time = DateTime.UtcNow });

    [HttpGet("error")]
    public IActionResult Error() => throw new NotFoundException("Thử lỗi 404");
}