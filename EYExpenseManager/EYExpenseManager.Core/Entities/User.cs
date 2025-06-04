using System;
using System.ComponentModel.DataAnnotations;
using EYExpenseManager.Core.Entities;

namespace EYExpenseManager.Core.Entities
{
    public class User
    {
        public int Id { get; set; }

        [Required, StringLength(50)]
        public string IdUser { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string NameUser { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string Surname { get; set; } = string.Empty;

        [Required, EmailAddress, StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required, StringLength(100, MinimumLength = 6)]
        public string Password { get; set; } = string.Empty;

        public string Secret { get; set; } = string.Empty;

        public Role Role { get; set; } = Role.User;

        public bool Enabled { get; set; } = false;
        public bool EmailVerified { get; set; } = false;
        public bool IsFirstLogin { get; set; } = true;
        public string? VerificationToken { get; set; }
        public DateTime? VerificationTokenExpiry { get; set; }
        public string? PasswordResetToken { get; set; }
        public DateTime? PasswordResetTokenExpiry { get; set; }
        public string? GoogleId { get; set; }  // For Google Authentication

        [StringLength(50)]
        public string Gpn { get; set; } = string.Empty;

        public string? ProfileImagePath { get; set; }
        public string? ProfileImageFileName { get; set; }
        public string? ProfileImageContentType { get; set; }
    }

    public enum Role
    {
        Admin = 1,
        User = 2,
        Manager = 3,
        Associer = 4,
        Employe = 5
    }
}
