using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Controllers;

// PB18: quản lý gói đọc tháng
[ApiController]
[Route("api/packages")]
public class PackagesController(IPackageService packages) : ControllerBase
{
    /// <summary>Danh sách gói đang bán</summary>
    [HttpGet]
    public async Task<ActionResult<List<PackageDto>>> GetActive() => Ok(await packages.GetActiveAsync());

    /// <summary>Tất cả gói, kể cả đã ngừng cung cấp</summary>
    [Authorize(Roles = "Admin")]
    [HttpGet("admin")]
    public async Task<ActionResult<List<PackageDto>>> GetAll() => Ok(await packages.GetAllAsync());

    [Authorize(Roles = "Admin")]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PackageDto>> Get(int id) => Ok(await packages.GetAsync(id));

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<PackageDto>> Create(PackageRequest req) => Ok(await packages.CreateAsync(req));

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<PackageDto>> Update(int id, PackageRequest req) => Ok(await packages.UpdateAsync(id, req));
}
