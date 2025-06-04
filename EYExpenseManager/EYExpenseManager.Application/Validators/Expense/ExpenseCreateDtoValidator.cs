using FluentValidation;
using EYExpenseManager.Application.DTOs.Expense;
using System;

namespace EYExpenseManager.Application.Validators.Expense
{
    public class ExpenseCreateDtoValidator : AbstractValidator<ExpenseCreateDto>
    {
        public ExpenseCreateDtoValidator()
        {
            RuleFor(x => x.MissionId)
                .GreaterThan(0).WithMessage("Mission ID is required");

            RuleFor(x => x.Description)
                .NotEmpty().WithMessage("Description is required")
                .MaximumLength(500).WithMessage("Description cannot exceed 500 characters");

            RuleFor(x => x.Amount)
                .NotEmpty().WithMessage("Amount is required")
                .GreaterThanOrEqualTo(0).WithMessage("Amount must be non-negative");

            RuleFor(x => x.Currency)
                .NotEmpty().WithMessage("Currency is required")
                .MaximumLength(10).WithMessage("Currency cannot exceed 10 characters");

            RuleFor(x => x.ConvertedAmount)
                .GreaterThanOrEqualTo(0).WithMessage("Converted amount must be non-negative");

            RuleFor(x => x.ExpenseDate)
                .NotEmpty().WithMessage("Expense date is required")
                .Must(BeAValidDate).WithMessage("Invalid expense date");

            RuleFor(x => x.Category)
                .MaximumLength(100).WithMessage("Category cannot exceed 100 characters");

            RuleFor(x => x.ReceiptUrl)
                .Must(BeAValidUrlOrEmpty).WithMessage("Invalid URL format for receipt");

            RuleFor(x => x.Status)
                .MaximumLength(50).WithMessage("Status cannot exceed 50 characters");

            RuleFor(x => x.CreatedBy)
                .NotEmpty().WithMessage("Created By is required")
                .MaximumLength(100).WithMessage("Created By cannot exceed 100 characters");
        }

        private bool BeAValidDate(DateTime date)
        {
            return date != default;
        }

        private bool BeAValidUrlOrEmpty(string url)
        {
            if (string.IsNullOrWhiteSpace(url))
                return true;

            return Uri.TryCreate(url, UriKind.Absolute, out _);
        }
    }

    public class ExpenseUpdateDtoValidator : AbstractValidator<ExpenseUpdateDto>
    {
        public ExpenseUpdateDtoValidator()
        {
            RuleFor(x => x.Id)
                .GreaterThan(0).WithMessage("Invalid Expense ID");

            When(x => x.MissionId.HasValue, () => {
                RuleFor(x => x.MissionId)
                    .GreaterThan(0).WithMessage("Mission ID must be greater than 0");
            });

            When(x => x.Description != null, () => {
                RuleFor(x => x.Description)
                    .MaximumLength(500).WithMessage("Description cannot exceed 500 characters");
            });

            When(x => x.Amount.HasValue, () => {
                RuleFor(x => x.Amount)
                    .GreaterThanOrEqualTo(0).WithMessage("Amount must be non-negative");
            });

            When(x => x.Currency != null, () => {
                RuleFor(x => x.Currency)
                    .MaximumLength(10).WithMessage("Currency cannot exceed 10 characters");
            });

            When(x => x.ConvertedAmount.HasValue, () => {
                RuleFor(x => x.ConvertedAmount)
                    .GreaterThanOrEqualTo(0).WithMessage("Converted amount must be non-negative");
            });

            When(x => x.ExpenseDate.HasValue, () => {
                RuleFor(x => x.ExpenseDate)
                    .Must(BeAValidDate).WithMessage("Invalid expense date");
            });

            When(x => x.Category != null, () => {
                RuleFor(x => x.Category)
                    .MaximumLength(100).WithMessage("Category cannot exceed 100 characters");
            });

            When(x => x.ReceiptUrl != null, () => {
                RuleFor(x => x.ReceiptUrl)
                    .Must(BeAValidUrlOrEmpty).WithMessage("Invalid URL format for receipt");
            });

            When(x => x.Status != null, () => {
                RuleFor(x => x.Status)
                    .MaximumLength(50).WithMessage("Status cannot exceed 50 characters");
            });
        }

        private bool BeAValidDate(DateTime? date)
        {
            return date.HasValue && date.Value != default;
        }

        private bool BeAValidUrlOrEmpty(string? url)
        {
            if (string.IsNullOrWhiteSpace(url))
                return true;

            return Uri.TryCreate(url, UriKind.Absolute, out _);
        }
    }
}