namespace QuanLyDocTruyen.API.Entities;

public class UserAvatar
{
    public int UserId { get; set; }
    public byte[] ImageData { get; set; } = [];
    public string ContentType { get; set; } = "";
    public User User { get; set; } = null!;
}
