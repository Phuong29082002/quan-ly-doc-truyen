using Microsoft.AspNetCore.Mvc;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.API.Controllers;

/// <summary>PB61: chatbot gợi ý truyện (khách và thành viên đều dùng được; có đăng nhập thì gợi ý theo sở thích)</summary>
[ApiController]
[Route("api/chatbot")]
public class ChatbotController(IChatbotService chatbot) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ChatbotReplyDto>> Ask(ChatbotRequest req)
        => Ok(await chatbot.AskAsync(req.Message, User.GetUserId()));
}
