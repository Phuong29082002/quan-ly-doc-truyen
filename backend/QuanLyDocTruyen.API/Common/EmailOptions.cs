namespace QuanLyDocTruyen.API.Common;

public class EmailOptions
{
    public string Host { get; set; } = "smtp.gmail.com";
    public int Port { get; set; } = 587;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string DisplayName { get; set; } = "Quản Lý Đọc Truyện";
}
