using FluentValidation;
using EYExpenseManager.Application.DTOs.Expense;

namespace EYExpenseManager.Application.Validators.Expense
{
    public class ExpenseCreateFromDocumentDtoValidator : AbstractValidator<ExpenseCreateFromDocumentDto>
    {
        public ExpenseCreateFromDocumentDtoValidator()
        {
            RuleFor(e => e.MissionId)
                .GreaterThan(0).When(e => e.DocumentFile == null)
                .WithMessage("Mission ID is required when no document is provided");

            RuleFor(e => e.Description)
                .NotEmpty().When(e => e.DocumentFile == null)
                .WithMessage("Description is required when no document is provided");

            RuleFor(e => e.Amount)
                .GreaterThan(0).When(e => e.DocumentFile == null)
                .WithMessage("Amount is required and must be greater than zero when no document is provided");

            RuleFor(e => e.Currency)
                .NotEmpty().When(e => e.DocumentFile == null)
                .WithMessage("Currency is required when no document is provided");

            RuleFor(e => e.ExpenseDate)
                .NotEmpty()
                .WithMessage("Expense date is required");

            RuleFor(e => e.CreatedBy)
                .NotEmpty()
                .WithMessage("Created by is required");

            RuleFor(e => e.DocumentFile)
                .NotNull()
                .When(e => e.MissionId == 0 || string.IsNullOrEmpty(e.Description) || e.Amount == 0 || string.IsNullOrEmpty(e.Currency))
                .WithMessage("A document file is required when mission details are not provided");
        }
    }
}