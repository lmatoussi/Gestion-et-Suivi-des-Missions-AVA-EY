using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace EYExpenseManager.Application.DTOs.Expense
{
    public class ExpenseCreateFromDocumentDto
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
        public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;

        [StringLength(100)]
        public string Category { get; set; } = string.Empty;

        [Url]
        public string ReceiptUrl { get; set; } = string.Empty;

        [StringLength(50)]
        public string Status { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string CreatedBy { get; set; } = string.Empty;

        // The actual document file
        public IFormFile? DocumentFile { get; set; }
    }
}