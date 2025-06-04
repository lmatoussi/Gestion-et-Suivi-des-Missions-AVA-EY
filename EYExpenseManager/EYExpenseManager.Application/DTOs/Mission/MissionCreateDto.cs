using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using EYExpenseManager.Core.Entities;

namespace EYExpenseManager.Application.DTOs.Mission
{
    public class MissionCreateDto
    {
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

        public int? AssocierId { get; set; }

        [StringLength(50)]
        public string Status { get; set; } = string.Empty;

        [Required, StringLength(100)]
        public string CreatedBy { get; set; } = string.Empty;
    }

    public class MissionUpdateDto
    {
        public int Id { get; set; }

        [StringLength(50)]
        public string? IdMission { get; set; }

        [StringLength(100)]
        public string? NomDeContract { get; set; }

        [StringLength(100)]
        public string? Client { get; set; }

        public DateTime? DateSignature { get; set; }

        [StringLength(50)]
        public string? EngagementCode { get; set; }

        [StringLength(50)]
        public string? Pays { get; set; }

        [Range(0, double.MaxValue)]
        public double? MontantDevise { get; set; }

        [Range(0, double.MaxValue)]
        public double? MontantTnd { get; set; }

        [Range(0, double.MaxValue)]
        public double? Ava { get; set; }

        public int? AssocierId { get; set; }

        [StringLength(50)]
        public string? Status { get; set; }
    }

    public class MissionResponseDto
    {
        public int Id { get; set; }
        public string IdMission { get; set; } = string.Empty;
        public string NomDeContract { get; set; } = string.Empty;
        public string Client { get; set; } = string.Empty;
        public DateTime DateSignature { get; set; }
        public string EngagementCode { get; set; } = string.Empty;
        public string Pays { get; set; } = string.Empty;
        public double MontantDevise { get; set; }
        public double MontantTnd { get; set; }
        public double Ava { get; set; }
        public int? AssocierId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedDate { get; set; }
    }
}