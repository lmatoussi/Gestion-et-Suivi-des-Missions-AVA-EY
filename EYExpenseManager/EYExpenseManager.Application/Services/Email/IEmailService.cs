using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Mail;

namespace EYExpenseManager.Application.Services.Email
{
    public interface IEmailService
    {
        Task SendVerificationEmailAsync(string recipientEmail, string userName, string verificationLink);
        Task SendPasswordResetEmailAsync(string recipientEmail, string userName, string resetLink);
        Task SendAccountApprovedEmailAsync(string recipientEmail, string userName, string loginLink);
    }

    public class EmailServiceConfiguration
    {
        public string SmtpServer { get; set; } = string.Empty;
        public int SmtpPort { get; set; } = 587;
        public string SenderEmail { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public string SmtpUsername { get; set; } = string.Empty;
        public string SmtpPassword { get; set; } = string.Empty;
        public bool UseSSL { get; set; } = true;
        public string BaseUrl { get; set; } = string.Empty;
    }

    public class EmailService : IEmailService
    {
        private readonly EmailServiceConfiguration _config;

        public EmailService(IOptions<EmailServiceConfiguration> config)
        {
            _config = config.Value;
        }

        public async Task SendVerificationEmailAsync(string recipientEmail, string userName, string verificationLink)
        {
            var subject = "EY Expense Manager: New User Account Verification";
            var body = $@"<html>
                <body>
                    <h2>New User Account Requires Verification</h2>
                    <p>A new user account has been created for {userName} and requires your approval.</p>
                    <p>Click the link below to verify this account:</p>
                    <a href='{verificationLink}'>Verify Account</a>
                    <p>This link will expire in 48 hours.</p>
                </body>
            </html>";

            await SendEmailAsync(recipientEmail, subject, body);
        }

        public async Task SendPasswordResetEmailAsync(string recipientEmail, string userName, string resetLink)
        {
            var subject = "EY Expense Manager: Password Reset";
            var body = $@"<html>
                <body>
                    <h2>Password Reset Request</h2>
                    <p>Hello {userName},</p>
                    <p>You recently requested to reset your password. Click the link below to set a new password:</p>
                    <a href='{resetLink}'>Reset Your Password</a>
                    <p>This link will expire in 24 hours.</p>
                    <p>If you did not request this, please ignore this email.</p>
                </body>
            </html>";

            await SendEmailAsync(recipientEmail, subject, body);
        }

        public async Task SendAccountApprovedEmailAsync(string recipientEmail, string userName, string loginLink)
        {
            var subject = "EY Expense Manager: Account Approved";
            var body = $@"<html>
                <body>
                    <h2>Your Account Has Been Approved</h2>
                    <p>Hello {userName},</p>
                    <p>Your account has been approved by an administrator. You can now set your password and access the system.</p>
                    <a href='{loginLink}'>Set Your Password</a>
                    <p>Note: You will need to set a new password when you first log in.</p>
                </body>
            </html>";

            await SendEmailAsync(recipientEmail, subject, body);
        }

        private async Task SendEmailAsync(string recipientEmail, string subject, string body)
        {
            using (var client = new SmtpClient(_config.SmtpServer, _config.SmtpPort))
            {
                client.EnableSsl = _config.UseSSL;
                client.UseDefaultCredentials = false;
                client.Credentials = new NetworkCredential(_config.SmtpUsername, _config.SmtpPassword);

                using (var message = new MailMessage())
                {
                    message.From = new MailAddress(_config.SenderEmail, _config.SenderName);
                    message.Subject = subject;
                    message.Body = body;
                    message.IsBodyHtml = true;
                    message.To.Add(recipientEmail);

                    await client.SendMailAsync(message);
                }
            }
        }
    }
}
