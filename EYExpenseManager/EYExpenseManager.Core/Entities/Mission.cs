using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using EYExpenseManager.Core.Entities;

namespace EYExpenseManager.Core.Entities
{
    public class Mission
    {
        public int Id { get; set; }

        [Required, StringLength(50)]
        public string IdMission { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string NomDeContract { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string Client { get; set; } = string.Empty;

        [Required]
        public DateTime DateSignature { get; set; }

        [StringLength(50)]
        public string EngagementCode { get; set; } = string.Empty;

        [StringLength(50)]
        public string Pays { get; set; } = string.Empty;

        [Range(0, double.MaxValue)]
        public double MontantDevise { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public double MontantTnd { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public double Ava { get; set; } = 0;

        // Foreign Keys
        public int? AssocierId { get; set; } // Nullable

        public User? Associer { get; set; }  // Nullable association

        public List<User> Employes { get; set; } = new List<User>();

        [StringLength(50)]
        public string Status { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string CreatedBy { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
    }
}
