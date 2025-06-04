using FluentValidation;
using EYExpenseManager.Application.DTOs.Mission;
using System;

namespace EYExpenseManager.Application.Validators.Mission
{
    public class MissionCreateDtoValidator : AbstractValidator<MissionCreateDto>
    {
        public MissionCreateDtoValidator()
        {
            RuleFor(x => x.IdMission)
                .NotEmpty().WithMessage("Mission ID is required")
                .MaximumLength(50).WithMessage("Mission ID cannot exceed 50 characters");

            RuleFor(x => x.NomDeContract)
                .NotEmpty().WithMessage("Contract Name is required")
                .MaximumLength(100).WithMessage("Contract Name cannot exceed 100 characters");

            RuleFor(x => x.Client)
                .NotEmpty().WithMessage("Client is required")
                .MaximumLength(100).WithMessage("Client name cannot exceed 100 characters");

            RuleFor(x => x.DateSignature)
                .NotEmpty().WithMessage("Signature Date is required")
                .Must(BeAValidDate).WithMessage("Invalid Signature Date");

            RuleFor(x => x.MontantDevise)
                .GreaterThanOrEqualTo(0).WithMessage("Devise Amount must be non-negative");

            RuleFor(x => x.MontantTnd)
                .GreaterThanOrEqualTo(0).WithMessage("TND Amount must be non-negative");

            RuleFor(x => x.Ava)
                .GreaterThanOrEqualTo(0).WithMessage("AVA must be non-negative");

            RuleFor(x => x.CreatedBy)
                .NotEmpty().WithMessage("Created By is required")
                .MaximumLength(100).WithMessage("Created By cannot exceed 100 characters");
        }

        private bool BeAValidDate(DateTime date)
        {
            return date != default;
        }

    }

    public class MissionUpdateDtoValidator : AbstractValidator<MissionUpdateDto>
    {
        public MissionUpdateDtoValidator()
        {
            RuleFor(x => x.Id)
                .GreaterThan(0).WithMessage("Invalid Mission ID");

            When(x => x.IdMission != null, () => {
                RuleFor(x => x.IdMission)
                    .MaximumLength(50).WithMessage("Mission ID cannot exceed 50 characters");
            });

            When(x => x.NomDeContract != null, () => {
                RuleFor(x => x.NomDeContract)
                    .MaximumLength(100).WithMessage("Contract Name cannot exceed 100 characters");
            });

            // Updated date validation
            When(x => x.DateSignature.HasValue, () => {
                RuleFor(x => x.DateSignature)
                    .Must(BeAValidDate).WithMessage("Invalid Signature Date");
            });

            // Updated numeric validations
            When(x => x.MontantDevise.HasValue, () => {
                RuleFor(x => x.MontantDevise)
                    .GreaterThanOrEqualTo(0).WithMessage("Devise Amount must be non-negative");
            });

            When(x => x.MontantTnd.HasValue, () => {
                RuleFor(x => x.MontantTnd)
                    .GreaterThanOrEqualTo(0).WithMessage("TND Amount must be non-negative");
            });

            When(x => x.Ava.HasValue, () => {
                RuleFor(x => x.Ava)
                    .GreaterThanOrEqualTo(0).WithMessage("AVA must be non-negative");
            });
        }

        // Updated to handle nullable dates
        private bool BeAValidDate(DateTime? date)
        {
            return date.HasValue && date.Value != default;
        }
    }

}