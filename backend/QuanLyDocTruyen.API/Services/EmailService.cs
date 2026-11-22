using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using QuanLyDocTruyen.API.Common;

namespace QuanLyDocTruyen.API.Services;

public interface IEmailService
{
    Task SendOtpAsync(string toEmail, string otp);
}

public class EmailService(IOptions<EmailOptions> options) : IEmailService
{
    private readonly EmailOptions _opt = options.Value;

    public async Task SendOtpAsync(string toEmail, string otp)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_opt.DisplayName, _opt.Username));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = "Mã OTP đặt lại mật khẩu";

        var body = new BodyBuilder
        {
            HtmlBody = $@"
<div style='font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px'>
  <h2 style='color:#1d4ed8;margin-bottom:8px'>Đặt lại mật khẩu</h2>
  <p style='color:#374151'>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
  <p style='color:#374151'>Mã OTP của bạn là:</p>
  <div style='font-size:36px;font-weight:bold;letter-spacing:12px;color:#1d4ed8;text-align:center;padding:16px 0'>{otp}</div>
  <p style='color:#6b7280;font-size:14px'>Mã có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ mã này với bất kỳ ai.</p>
  <hr style='border:none;border-top:1px solid #e5e7eb;margin:16px 0'/>
  <p style='color:#9ca3af;font-size:12px'>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
</div>"
        };
        message.Body = body.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(_opt.Host, _opt.Port, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(_opt.Username, _opt.Password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}
