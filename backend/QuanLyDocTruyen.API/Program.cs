using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.Data;
using QuanLyDocTruyen.API.Entities;
using QuanLyDocTruyen.API.Services;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Cấu hình riêng trên máy (tài khoản ngân hàng nhận tiền, khóa VNPay...): không đưa lên GitHub
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// ---------- Xác thực JWT (PB02) + phân quyền theo vai trò (PB03) ----------
var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services.Configure<JwtOptions>(jwtSection);
var jwt = jwtSection.Get<JwtOptions>()!;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            NameClaimType = "name",
            RoleClaimType = "role"
        };
        // PB46: SignalR (WebSocket) không gửi được header nên token đi kèm query ?access_token=
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();

// ---------- Services ----------
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IGenreService, GenreService>();
builder.Services.AddScoped<IStoryService, StoryService>();
builder.Services.AddScoped<IChapterService, ChapterService>();
builder.Services.AddScoped<IPackageService, PackageService>();
builder.Services.AddScoped<IImageUploadService, ImageUploadService>();
builder.Services.AddScoped<IReadingService, ReadingService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.Configure<VnPayOptions>(builder.Configuration.GetSection("VnPay"));
builder.Services.Configure<PaymentOptions>(builder.Configuration.GetSection("Payment"));
builder.Services.Configure<BankQrOptions>(builder.Configuration.GetSection("BankQr"));

// Sprint 4: theo dõi, thông báo, thảo luận, quản lý thành viên
builder.Services.AddMemoryCache();
builder.Services.AddSignalR();
builder.Services.AddScoped<IFollowService, FollowService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<IAdminUserService, AdminUserService>();
builder.Services.AddHostedService<NewChapterNotifier>();

builder.Services.AddControllers().AddJsonOptions(o =>
{
    // Enum trả về dạng chữ ("Ongoing", "Admin"...) thay vì số
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    // Thời gian luôn trả về giờ UTC có chữ Z
    o.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter());
});
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

builder.Services.AddCors(o => o.AddPolicy("Frontend", p => p
    .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

var app = builder.Build();

// Tạo DB, tài khoản admin (admin / Admin@123) và dữ liệu mẫu
using (var scope = app.Services.CreateScope())
{
    await DbSeeder.SeedAsync(scope.ServiceProvider);
}

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseStaticFiles(); // phục vụ ảnh bìa trong wwwroot/uploads
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<UserStatusMiddleware>();
app.MapControllers();
app.MapHub<QuanLyDocTruyen.API.Hubs.NotificationHub>("/hubs/notifications");

app.Run();
