namespace QuanLyDocTruyen.API.Entities;

public class StoryGenre
{
    public int StoryId { get; set; }
    public Story Story { get; set; } = null!;
    public int GenreId { get; set; }
    public Genre Genre { get; set; } = null!;
}