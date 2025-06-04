using System;
using System.ComponentModel.DataAnnotations;

namespace EYExpenseManager.Application.DTOs.Expense
{
    public class ExpenseCreateDto
    {
        [Required]
        public int MissionId { get; set; }

        [Required, StringLength(500)]
        public string Description { get; set; } = string.Empty;

        [Required, Range(0, double.MaxValue)]
        public decimal Amount { get; set; }

        [Required, StringLength(10)]
        public string Currency { get; set; } = string.Empty;

        [Range(0, double.MaxValue)]
        public decimal ConvertedAmount { get; set; }

        [Required]
        public DateTime ExpenseDate { get; set; }

        [StringLength(100)]
        public string Category { get; set; } = string.Empty;

        [Url]
        public string ReceiptUrl { get; set; } = string.Empty;

        [StringLength(50)]
        public string Status { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string CreatedBy { get; set; } = string.Empty;
    }

    public class ExpenseUpdateDto
    {
        public int Id { get; set; }

        public int? MissionId { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? Amount { get; set; }

        [StringLength(10)]
        public string? Currency { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? ConvertedAmount { get; set; }

        public DateTime? ExpenseDate { get; set; }

        [StringLength(100)]
        public string? Category { get; set; }

        [Url]
        public string? ReceiptUrl { get; set; }

        [StringLength(50)]
        public string? Status { get; set; }
    }

    public class ExpenseResponseDto
    {
        public int Id { get; set; }
        public int MissionId { get; set; }
        public string MissionName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;
        public decimal ConvertedAmount { get; set; }
        public DateTime ExpenseDate { get; set; }
        public string Category { get; set; } = string.Empty;
        public string ReceiptUrl { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedDate { get; set; }
    }
}