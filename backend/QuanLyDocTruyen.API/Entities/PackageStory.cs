namespace QuanLyDocTruyen.API.Entities;

public class PackageStory
{
    public int PackageId { get; set; }
    public Package Package { get; set; } = null!;
    public int StoryId { get; set; }
    public Story Story { get; set; } = null!;
}