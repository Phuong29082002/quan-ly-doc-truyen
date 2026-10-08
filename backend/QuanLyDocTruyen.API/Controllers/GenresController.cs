using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Controllers;

// PB05: quản lý thể loại
[ApiController]
[Route("api/genres")]
public class GenresController(IGenreService genres) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<GenreDto>>> GetAll() => Ok(await genres.GetAllAsync());

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<GenreDto>> Create(GenreRequest req) => Ok(await genres.CreateAsync(req));

    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<GenreDto>> Update(int id, GenreRequest req) => Ok(await genres.UpdateAsync(id, req));

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await genres.DeleteAsync(id);
        return NoContent();
    }
}
