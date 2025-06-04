using System;
using System.ComponentModel.DataAnnotations;
using EYExpenseManager.Core.Entities;
namespace EYExpenseManager.Core.Entities
{
    public class Expense
    {
        public int Id { get; set; }

        // Foreign key reference
        public int MissionId { get; set; }
        public Mission? Mission { get; set; }

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

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
    }
}
