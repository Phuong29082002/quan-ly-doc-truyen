using System.Text.Json;
using System.Text.Json.Serialization;

namespace QuanLyDocTruyen.API.Common;

/// <summary>
/// Thời gian lưu trong DB là giờ UTC nhưng SQL Server không nhớ "Kind".
/// Converter này luôn trả về dạng ...Z để web/app tự đổi sang giờ Việt Nam cho đúng.
/// </summary>
public class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetDateTime();
        return value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(value, DateTimeKind.Local).ToUniversalTime() : value.ToUniversalTime();
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        var utc = value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(value, DateTimeKind.Utc) : value.ToUniversalTime();
        writer.WriteStringValue(utc.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
    }
}
