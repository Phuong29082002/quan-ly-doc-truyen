using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using QuanLyDocTruyen.API.Common;
using QuanLyDocTruyen.API.DTOs;
using QuanLyDocTruyen.API.Entities;
using QuanLyDocTruyen.API.Services;

namespace QuanLyDocTruyen.Tests;

public class AuthServiceTests
{
    private class MockEmailService : IEmailService
    {
        public string? LastEmail { get; private set; }
        public string? LastOtp { get; private set; }

        public Task SendOtpAsync(string toEmail, string otp)
        {
            LastEmail = toEmail;
            LastOtp = otp;
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task ForgotPassword_GeneratesOtp_And_ResetPassword_UpdatesPassword()
    {
        using var testDb = new TestDb();
        var hasher = new PasswordHasher<User>();
        var user = new User
        {
            Username = "user_forgot",
            Email = "user_forgot@test.local",
            DisplayName = "User Forgot",
        };
        user.PasswordHash = hasher.HashPassword(user, "OldPassword123");
        testDb.Db.Users.Add(user);
        await testDb.Db.SaveChangesAsync();

        var cache = new MemoryCache(new MemoryCacheOptions());
        var mockEmail = new MockEmailService();
        var jwtOptions = Options.Create(new JwtOptions { Key = "12345678901234567890123456789012" });
        var config = new ConfigurationBuilder().Build();

        var authService = new AuthService(testDb.Db, hasher, jwtOptions, cache, mockEmail, config);

        // 1. Quên mật khẩu -> gửi OTP
        await authService.ForgotPasswordAsync("user_forgot@test.local");

        Assert.Equal("user_forgot@test.local", mockEmail.LastEmail);
        Assert.NotNull(mockEmail.LastOtp);
        Assert.Equal(6, mockEmail.LastOtp.Length);

        // 2. Đặt lại mật khẩu với OTP đúng
        await authService.ResetPasswordAsync(new ResetPasswordRequest
        {
            Email = "user_forgot@test.local",
            Otp = mockEmail.LastOtp,
            NewPassword = "NewPassword123!"
        });

        // 3. Kiểm tra mật khẩu mới đã được cập nhật
        var updatedUser = await testDb.Db.Users.FindAsync(user.Id);
        Assert.NotNull(updatedUser);
        var result = hasher.VerifyHashedPassword(updatedUser, updatedUser.PasswordHash, "NewPassword123!");
        Assert.Equal(PasswordVerificationResult.Success, result);
    }
}
