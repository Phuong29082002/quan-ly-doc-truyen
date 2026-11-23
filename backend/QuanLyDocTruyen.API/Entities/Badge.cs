namespace QuanLyDocTruyen.API.Entities;

/// <summary>Loại điều kiện để nhận huy hiệu</summary>
public enum BadgeCriteria
{
    Streak,        // đọc liên tục N ngày
    ChaptersRead   // đã đọc tổng N chương
}

/// <summary>PB60: huy hiệu thành tích</summary>
public class Badge
{
    public int Id { get; set; }
    public string Code { get; set; } = "";        // mã duy nhất, ví dụ "STREAK_7"
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string Icon { get; set; } = "🏅";      // emoji hiển thị
    public BadgeCriteria Criteria { get; set; }
    public int Threshold { get; set; }            // mốc cần đạt, ví dụ 7 ngày
}