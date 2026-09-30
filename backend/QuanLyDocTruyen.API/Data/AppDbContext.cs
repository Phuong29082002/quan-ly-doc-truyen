using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Genre> Genres => Set<Genre>();
    public DbSet<Story> Stories => Set<Story>();
    public DbSet<StoryGenre> StoryGenres => Set<StoryGenre>();
    public DbSet<Chapter> Chapters => Set<Chapter>();
    public DbSet<Package> Packages => Set<Package>();
    public DbSet<PackageStory> PackageStories => Set<PackageStory>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<UserPackage> UserPackages => Set<UserPackage>();
    public DbSet<StoryPurchase> StoryPurchases => Set<StoryPurchase>();
    public DbSet<ReadingProgress> ReadingProgresses => Set<ReadingProgress>();
    public DbSet<Follow> Follows => Set<Follow>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ChapterView> ChapterViews => Set<ChapterView>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<CommentReport> CommentReports => Set<CommentReport>();

    protected override void ConfigureConventions(ModelConfigurationBuilder b)
    {
        b.Properties<Enum>().HaveConversion<string>().HaveMaxLength(20);
        b.Properties<decimal>().HavePrecision(18, 2);
    }

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.Entity<StoryGenre>().HasKey(x => new { x.StoryId, x.GenreId });
        m.Entity<PackageStory>().HasKey(x => new { x.PackageId, x.StoryId });
        m.Entity<ReadingProgress>().HasKey(x => new { x.UserId, x.StoryId });
        m.Entity<Follow>().HasKey(x => new { x.UserId, x.StoryId });

        m.Entity<User>().HasIndex(x => x.Username).IsUnique();
        m.Entity<User>().HasIndex(x => x.Email).IsUnique();
        m.Entity<Genre>().HasIndex(x => x.Name).IsUnique();
        m.Entity<Chapter>().HasIndex(x => new { x.StoryId, x.Number }).IsUnique();
        m.Entity<ChapterView>().HasIndex(x => x.ViewedAt);

        m.Entity<Comment>()
            .HasOne(x => x.Parent).WithMany(x => x.Replies).HasForeignKey(x => x.ParentId);

        foreach (var fk in m.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            fk.DeleteBehavior = DeleteBehavior.Restrict;
    }
}