using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService auth) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest req)
        => Ok(await auth.RegisterAsync(req));

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest req)
        => Ok(await auth.LoginAsync(req));

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var userId = int.Parse(User.FindFirst("sub")!.Value);
        return Ok(await auth.GetMeAsync(userId));
    }

    // PB04: cập nhật tên hiển thị
    [Authorize]
    [HttpPut("me")]
    public async Task<ActionResult<UserDto>> UpdateProfile(UpdateProfileRequest req)
        => Ok(await auth.UpdateProfileAsync(CurrentUserId, req));

    // PB04: ảnh đại diện (multipart/form-data, field "file")
    [Authorize]
    [HttpPost("me/avatar")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<UserDto>> UploadAvatar(IFormFile file)
        => Ok(await auth.UploadAvatarAsync(CurrentUserId, file));

    // PB04: đổi mật khẩu (cần mật khẩu cũ)
    [Authorize]
    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest req)
    {
        await auth.ChangePasswordAsync(CurrentUserId, req);
        return NoContent();
    }

    private int CurrentUserId => int.Parse(User.FindFirst("sub")!.Value);
}