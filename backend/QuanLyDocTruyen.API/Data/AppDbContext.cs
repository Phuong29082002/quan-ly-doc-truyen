using Microsoft.EntityFrameworkCore;
using QuanLyDocTruyen.API.Entities;

namespace QuanLyDocTruyen.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserAvatar> UserAvatars => Set<UserAvatar>();
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
    public DbSet<Rating> Ratings => Set<Rating>();
    public DbSet<CoinTransaction> CoinTransactions => Set<CoinTransaction>();
    public DbSet<ChapterUnlock> ChapterUnlocks => Set<ChapterUnlock>();
    public DbSet<DailyMissionProgress> DailyMissionProgresses => Set<DailyMissionProgress>();

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
        m.Entity<Rating>().HasKey(x => new { x.UserId, x.StoryId });
        m.Entity<Rating>().ToTable(t => t.HasCheckConstraint("CK_Rating_Score", "[Score] BETWEEN 1 AND 5"));
        m.Entity<Follow>().HasIndex(x => x.CreatedAt);
        m.Entity<Transaction>().HasIndex(x => x.CreatedAt);

        m.Entity<User>().HasIndex(x => x.Username).IsUnique();
        m.Entity<User>().HasIndex(x => x.Email).IsUnique();
        m.Entity<UserAvatar>().HasKey(x => x.UserId);
        m.Entity<UserAvatar>().Property(x => x.ContentType).HasMaxLength(100);
        m.Entity<UserAvatar>().HasOne(x => x.User).WithOne(x => x.Avatar).HasForeignKey<UserAvatar>(x => x.UserId);
        m.Entity<Genre>().HasIndex(x => x.Name).IsUnique();
        m.Entity<Chapter>().HasIndex(x => new { x.StoryId, x.Number }).IsUnique();
        m.Entity<ChapterView>().HasIndex(x => x.ViewedAt);

        m.Entity<ChapterUnlock>().HasIndex(x => new { x.UserId, x.ChapterId }).IsUnique();
        m.Entity<CoinTransaction>().HasIndex(x => new { x.UserId, x.CreatedAt });
        m.Entity<DailyMissionProgress>().HasIndex(x => new { x.UserId, x.Date, x.MissionKey }).IsUnique();

        m.Entity<Comment>()
            .HasOne(x => x.Parent).WithMany(x => x.Replies).HasForeignKey(x => x.ParentId);

        foreach (var fk in m.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            fk.DeleteBehavior = DeleteBehavior.Restrict;
    }
}
