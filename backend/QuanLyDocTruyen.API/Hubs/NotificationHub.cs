using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace QuanLyDocTruyen.API.Hubs;

/// <summary>
/// PB46: kênh thông báo thời gian thực. Mỗi thành viên vào nhóm "user-{id}";
/// có chương mới / có người trả lời thì máy chủ gửi sự kiện "notification" tới đúng nhóm.
/// Web kết nối tới /hubs/notifications?access_token=...
/// </summary>
[Authorize]
public class NotificationHub : Hub
{
    public static string GroupOf(int userId) => $"user-{userId}";

    public override async Task OnConnectedAsync()
    {
        if (int.TryParse(Context.User?.FindFirst("sub")?.Value, out var userId))
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupOf(userId));
        await base.OnConnectedAsync();
    }
}
