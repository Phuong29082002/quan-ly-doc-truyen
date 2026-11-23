using System.Globalization;
using System.Text;

namespace QuanLyDocTruyen.API.Common;

/// <summary>PB51: chuẩn hóa chuỗi để tìm kiếm tiếng Việt không dấu ("Vụ Án Phòng Số 7" -> "vu an phong so 7")</summary>
public static class TextSearch
{
    public static string Normalize(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "";

        var decomposed = text.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);
        var lastSpace = false;
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            var ch = c == 'đ' ? 'd' : c;
            if (char.IsWhiteSpace(ch))
            {
                if (!lastSpace) sb.Append(' ');
                lastSpace = true;
            }
            else
            {
                sb.Append(ch);
                lastSpace = false;
            }
        }
        return sb.ToString().Normalize(NormalizationForm.FormC);
    }

    public static string ForStory(string title, string author) => Normalize($"{title} {author}");
}
