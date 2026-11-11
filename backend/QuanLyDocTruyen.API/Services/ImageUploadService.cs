using QuanLyDocTruyen.API.Common;

namespace QuanLyDocTruyen.API.Services;

public interface IImageUploadService
{
    /// <summary>Lưu ảnh vào wwwroot/uploads/{folder} và trả về đường dẫn dạng /uploads/{folder}/{tên file}</summary>
    Task<string> SaveAsync(IFormFile? file, string folder, long maxBytes = 3 * 1024 * 1024);

    /// <summary>Xóa ảnh cũ (nếu là ảnh do hệ thống lưu trong /uploads/{folder}/)</summary>
    void Delete(string? url, string folder);
}

// PB43: lưu ảnh minh họa chèn vào nội dung chương (dùng chung được cho ảnh khác)
public class ImageUploadService(IWebHostEnvironment env) : IImageUploadService
{
    private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

    public async Task<string> SaveAsync(IFormFile? file, string folder, long maxBytes = 3 * 1024 * 1024)
    {
        if (file is null || file.Length == 0)
            throw new BadRequestException("Vui lòng chọn ảnh");
        if (file.Length > maxBytes)
            throw new BadRequestException($"Ảnh tối đa {maxBytes / 1024 / 1024}MB");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            throw new BadRequestException("Chỉ chấp nhận ảnh .jpg, .jpeg, .png, .webp, .gif");

        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var dir = Path.Combine(webRoot, "uploads", folder);
        Directory.CreateDirectory(dir);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        await using (var stream = File.Create(Path.Combine(dir, fileName)))
        {
            await file.CopyToAsync(stream);
        }

        return $"/uploads/{folder}/{fileName}";
    }

    public void Delete(string? url, string folder)
    {
        if (string.IsNullOrEmpty(url) || !url.StartsWith($"/uploads/{folder}/")) return;

        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var path = Path.Combine(webRoot, "uploads", folder, Path.GetFileName(url));
        if (File.Exists(path)) File.Delete(path);
    }
}
