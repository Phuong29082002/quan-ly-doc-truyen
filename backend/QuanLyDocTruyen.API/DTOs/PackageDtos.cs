using System.ComponentModel.DataAnnotations;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.DTOs;

// ---------- Gói đọc tháng (PB18) ----------

public record PackageStoryRefDto(int Id, string Title);

/// <summary>ActiveUserCount = số người đang dùng gói còn hạn (chỉ có ý nghĩa với Admin)</summary>
public record PackageDto(
    int Id,
    string Name,
    decimal Price,
    int DurationDays,
    PackageScope Scope,
    bool IsActive,
    DateTime CreatedAt,
    int ActiveUserCount,
    List<PackageStoryRefDto> Stories);

public class PackageRequest
{
    [Required(ErrorMessage = "Vui lòng nhập tên gói")]
    [StringLength(100, ErrorMessage = "Tên gói tối đa 100 ký tự")]
    public string Name { get; set; } = "";

    [Range(1, 100000000, ErrorMessage = "Mức phí phải lớn hơn 0")]
    public decimal Price { get; set; }

    [Range(1, 3650, ErrorMessage = "Thời hạn từ 1 đến 3650 ngày")]
    public int DurationDays { get; set; } = 30;

    public PackageScope Scope { get; set; } = PackageScope.All;

    /// <summary>false = ngừng cung cấp: không bán mới, người đang dùng vẫn còn hạn</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Chỉ dùng khi Scope = Selected</summary>
    public List<int> StoryIds { get; set; } = new();
}
