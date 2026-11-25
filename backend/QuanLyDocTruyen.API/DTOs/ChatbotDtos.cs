using System.ComponentModel.DataAnnotations;

namespace QuanLyDocTruyen.API.DTOs;

// ---------- PB61: chatbot gợi ý truyện ----------

public class ChatbotRequest
{
    [Required(ErrorMessage = "Vui lòng nhập câu hỏi")]
    [StringLength(300, ErrorMessage = "Câu hỏi tối đa 300 ký tự")]
    public string Message { get; set; } = "";
}

/// <summary>Reply: câu trả lời; Stories: truyện gợi ý (có thể rỗng); Suggestions: câu hỏi gợi ý để bấm nhanh</summary>
public record ChatbotReplyDto(string Reply, List<StoryListItemDto> Stories, List<string> Suggestions);
