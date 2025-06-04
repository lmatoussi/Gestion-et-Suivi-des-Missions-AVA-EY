using FluentValidation;
using EYExpenseManager.Application.DTOs.User;
using System.Text.RegularExpressions;

namespace EYExpenseManager.Application.Validators.User
{
    public class UserCreateDtoValidator : AbstractValidator<UserCreateDto>
    {
        public UserCreateDtoValidator()
        {
            RuleFor(x => x.IdUser)
                .NotEmpty().WithMessage("User ID is required")
                .MaximumLength(50).WithMessage("User ID cannot exceed 50 characters");

            RuleFor(x => x.NameUser)
                .NotEmpty().WithMessage("Name is required")
                .MaximumLength(100).WithMessage("Name cannot exceed 100 characters");

            RuleFor(x => x.Surname)
                .NotEmpty().WithMessage("Surname is required")
                .MaximumLength(100).WithMessage("Surname cannot exceed 100 characters");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required")
                .EmailAddress().WithMessage("Invalid email format")
                .MaximumLength(100).WithMessage("Email cannot exceed 100 characters");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required")
                .MinimumLength(6).WithMessage("Password must be at least 6 characters")
                .Must(BeAStrongPassword).WithMessage("Password must contain at least one uppercase, one lowercase, one number, and one special character");

            RuleFor(x => x.Gpn)
                .MaximumLength(50).WithMessage("GPN cannot exceed 50 characters");

            // Fix the null reference warnings with proper null checks
            When(x => x.ProfileImage != null, () => {
                RuleFor(x => x.ProfileImage)
                    .NotNull()
                    .Must(image => image != null && image.Length <= 5 * 1024 * 1024)
                    .WithMessage("Profile image must be less than 5MB");

                RuleFor(x => x.ProfileImage)
                    .NotNull()
                    .Must(image => image != null &&
                          (image.ContentType?.Equals("image/jpeg") == true ||
                           image.ContentType?.Equals("image/png") == true))
                    .WithMessage("Only JPEG or PNG images are allowed");
            });
        }

        private bool BeAStrongPassword(string password)
        {
            return Regex.IsMatch(password, @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{6,}$");
        }
    }

    public class UserUpdateDtoValidator : AbstractValidator<UserUpdateDto>
    {
        public UserUpdateDtoValidator()
        {
            RuleFor(x => x.Id)
                .GreaterThan(0).WithMessage("Invalid User ID");

            When(x => x.IdUser != null, () => {
                RuleFor(x => x.IdUser)
                    .MaximumLength(50).WithMessage("User ID cannot exceed 50 characters");
            });

            When(x => x.NameUser != null, () => {
                RuleFor(x => x.NameUser)
                    .MaximumLength(100).WithMessage("Name cannot exceed 100 characters");
            });

            When(x => x.Surname != null, () => {
                RuleFor(x => x.Surname)
                    .MaximumLength(100).WithMessage("Surname cannot exceed 100 characters");
            });

            When(x => x.Email != null, () => {
                RuleFor(x => x.Email)
                    .EmailAddress().WithMessage("Invalid email format")
                    .MaximumLength(100).WithMessage("Email cannot exceed 100 characters");
            });

            When(x => x.Gpn != null, () => {
                RuleFor(x => x.Gpn)
                    .MaximumLength(50).WithMessage("GPN cannot exceed 50 characters");
            });
        }
    }
}