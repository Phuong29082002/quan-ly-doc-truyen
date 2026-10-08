namespace QuanLyDocTruyen.API.Entities;

public class Package
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public int DurationDays { get; set; } = 30;
    public PackageScope Scope { get; set; } = PackageScope.All;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<PackageStory> PackageStories { get; set; } = new();
}