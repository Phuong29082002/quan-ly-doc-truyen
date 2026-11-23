namespace QuanLyDocTruyen.API.Entities;

public class UserStreak
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int CurrentStreak { get; set; }
    public int LongestStreak { get; set; }
    public DateOnly? LastReadDate { get; set; }
}