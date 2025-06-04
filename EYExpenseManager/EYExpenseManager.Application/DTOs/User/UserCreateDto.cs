using System.ComponentModel.DataAnnotations;
using EYExpenseManager.Core.Entities;
using Microsoft.AspNetCore.Http;


namespace EYExpenseManager.Application.DTOs.User
{
    public class UserCreateDto
    {
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

        [Required] // Ensure this is always provided
        public int Role { get; set; } = 2; // Default to User role

        [StringLength(50)]
        public string Gpn { get; set; } = string.Empty;

        public IFormFile? ProfileImage { get; set; }
    }

    public class UserUpdateDto
    {
        public int Id { get; set; }

        [StringLength(50)]
        public string? IdUser { get; set; }

        [StringLength(100)]
        public string? NameUser { get; set; }

        [StringLength(100)]
        public string? Surname { get; set; }

        [EmailAddress, StringLength(100)]
        public string? Email { get; set; }

        public Role? Role { get; set; }

        public bool? Enabled { get; set; }

        [StringLength(50)]
        public string? Gpn { get; set; }

        [StringLength(100, MinimumLength = 6)]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{6,}$")]
        public string? Password { get; set; }

        public IFormFile? ProfileImage { get; set; }
    }

    public class UserResponseDto
    {
        public int Id { get; set; }
        public string IdUser { get; set; } = string.Empty;
        public string NameUser { get; set; } = string.Empty;
        public string Surname { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public Role Role { get; set; }
        public string Gpn { get; set; } = string.Empty;
        public string? ProfileImageContentType { get; set; } // Make nullable to fix warning
        public string? ProfileImageUrl { get; set; }

        // New properties for account verification
        public bool EmailVerified { get; set; }
        public bool Enabled { get; set; }
        public bool PasswordChangeRequired { get; set; }
        public string? Token { get; set; }
        public string? PasswordResetToken { get; set; }
        public string? VerificationToken { get; set; }
    }

    public class UserLoginDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required, StringLength(100, MinimumLength = 6)]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{6,}$")]
        public string Password { get; set; } = string.Empty;
    }

    public class UserVerificationDto
    {
        public int UserId { get; set; }
        public string Token { get; set; } = string.Empty;
        public bool IsApproved { get; set; }
    }

    public class PasswordResetRequestDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = string.Empty;
    }

    public class PasswordResetDto
    {
        [Required]
        public string Token { get; set; } = string.Empty;

        [Required]
        public int UserId { get; set; }

        [Required, StringLength(100, MinimumLength = 6)]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{6,}$")]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class GoogleAuthDto
    {
        public string IdToken { get; set; } = string.Empty;
    }
}