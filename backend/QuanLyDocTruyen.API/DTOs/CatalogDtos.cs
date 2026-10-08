using System.ComponentModel.DataAnnotations;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.DTOs;

// ---------- Thể loại (PB05) ----------

public record GenreDto(int Id, string Name, int StoryCount);

public record GenreRefDto(int Id, string Name);

public class GenreRequest
{
    [Required(ErrorMessage = "Vui lòng nhập tên thể loại")]
    [StringLength(50, ErrorMessage = "Tên thể loại tối đa 50 ký tự")]
    public string Name { get; set; } = "";
}

// ---------- Truyện (PB06, PB07, PB11, PB13) ----------

public class StoryQuery
{
    public string? Keyword { get; set; }
    public int? GenreId { get; set; }
    public StoryStatus? Status { get; set; }

    /// <summary>updated = mới cập nhật, newest = mới phát hành, views = đọc nhiều</summary>
    public string Sort { get; set; } = "updated";

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 50)]
    public int PageSize { get; set; } = 12;
}

public record PagedResult<T>(List<T> Items, int Page, int PageSize, int TotalCount, int TotalPages);

public record StoryListItemDto(
    int Id,
    string Title,
    string Author,
    string? CoverUrl,
    StoryStatus Status,
    AccessType AccessType,
    List<GenreRefDto> Genres,
    int ChapterCount,
    long ViewCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

/// <summary>IsFree = đọc được miễn phí; IsPublished = false nghĩa là chương hẹn giờ (chỉ Admin thấy)</summary>
public record ChapterListItemDto(int Id, int Number, string Title, bool IsFree, bool IsPublished, DateTime PublishAt);

public record StoryDetailDto(
    int Id,
    string Title,
    string Author,
    string? Description,
    string? CoverUrl,
    StoryStatus Status,
    AccessType AccessType,
    decimal Price,
    int FreeChapterCount,
    long ViewCount,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    List<GenreRefDto> Genres,
    List<ChapterListItemDto> Chapters);

public class StoryRequest
{
    [Required(ErrorMessage = "Vui lòng nhập tên truyện")]
    [StringLength(200, ErrorMessage = "Tên truyện tối đa 200 ký tự")]
    public string Title { get; set; } = "";

    [Required(ErrorMessage = "Vui lòng nhập tác giả")]
    [StringLength(100, ErrorMessage = "Tên tác giả tối đa 100 ký tự")]
    public string Author { get; set; } = "";

    [StringLength(4000, ErrorMessage = "Giới thiệu tối đa 4000 ký tự")]
    public string? Description { get; set; }

    public StoryStatus Status { get; set; } = StoryStatus.Ongoing;

    // PB16, PB17: chính sách truy cập và giá mua truyện
    public AccessType AccessType { get; set; } = AccessType.Free;

    [Range(0, 100000000, ErrorMessage = "Giá truyện không hợp lệ")]
    public decimal Price { get; set; }

    [Range(0, 100000, ErrorMessage = "Số chương miễn phí không hợp lệ")]
    public int FreeChapterCount { get; set; }

    [MinLength(1, ErrorMessage = "Chọn ít nhất một thể loại")]
    public List<int> GenreIds { get; set; } = new();
}

public record CoverResponse(string CoverUrl);

// ---------- Chương (PB08, PB14) ----------

public class ChapterRequest
{
    [Range(1, 100000, ErrorMessage = "Số thứ tự chương phải lớn hơn 0")]
    public int Number { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập tên chương")]
    [StringLength(200, ErrorMessage = "Tên chương tối đa 200 ký tự")]
    public string Title { get; set; } = "";

    [Required(ErrorMessage = "Vui lòng nhập nội dung chương")]
    public string Content { get; set; } = "";

    public bool IsFree { get; set; }

    /// <summary>Bỏ trống = phát hành ngay</summary>
    public DateTime? PublishAt { get; set; }
}

public record ChapterAdminDto(int Id, int StoryId, int Number, string Title, string Content, bool IsFree, DateTime PublishAt);

public record ChapterContentDto(
    int Id,
    int StoryId,
    string StoryTitle,
    int Number,
    string Title,
    string Content,
    DateTime PublishAt,
    int? PrevNumber,
    int? NextNumber);
