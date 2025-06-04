using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using System.Text;
using EYExpenseManager.Core.Interfaces;
using System.Collections.Generic;
using System.Linq;
using EYExpenseManager.Core.Entities;
using CsvHelper;
using System.Globalization;

namespace EYExpenseManager.Application.Services
{
	public interface IDocumentProcessingService
	{
		Task<ExpenseDocumentResult> ProcessExpenseDocumentAsync(IFormFile file);
	}

	public class DocumentProcessingService : IDocumentProcessingService
	{
		private readonly IMissionRepository _missionRepository;

		public DocumentProcessingService(IMissionRepository missionRepository)
		{
			_missionRepository = missionRepository;
		}

		public async Task<ExpenseDocumentResult> ProcessExpenseDocumentAsync(IFormFile file)
		{
			if (file == null || file.Length == 0)
				throw new ArgumentException("File is empty or not provided.");

			string fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();

			// Process based on file type
			if (fileExtension == ".csv")
			{
				return await ProcessCsvFileAsync(file);
			}
			else if (fileExtension == ".xlsx" || fileExtension == ".xls")
			{
				return await ProcessExcelFileAsync(file);
			}
			else
			{
				throw new NotSupportedException($"File type {fileExtension} is not supported.");
			}
		}

		private async Task<ExpenseDocumentResult> ProcessCsvFileAsync(IFormFile file)
		{
			try
			{
				using var streamReader = new StreamReader(file.OpenReadStream());
				using var csvReader = new CsvReader(streamReader, CultureInfo.InvariantCulture);

				// Read the first record to get the mission identifier
				csvReader.Read();
				csvReader.ReadHeader();
				csvReader.Read();

				// Get mission ID from the document
				string missionId = csvReader.GetField<string>("MissionId") ??
								 csvReader.GetField<string>("IdMission");

				if (string.IsNullOrEmpty(missionId))
					throw new InvalidOperationException("Mission ID not found in the document");

				// Find the mission in the database
				var mission = await _missionRepository.GetByIdMissionAsync(missionId);
				if (mission == null)
					throw new InvalidOperationException($"Mission with ID {missionId} not found");

				// Extract expense-related data
				var result = new ExpenseDocumentResult
				{
					MissionId = mission.Id,
					MissionIdString = mission.IdMission,
					MissionName = mission.NomDeContract,
					Client = mission.Client,
					Currency = csvReader.GetField<string>("Currency") ?? "TND",
					Category = csvReader.GetField<string>("Category") ?? "",
					Description = csvReader.GetField<string>("Description") ??
								$"Expense for mission {mission.NomDeContract}",
					Status = "Draft"
				};

				// Try to get amount 
				if (csvReader.TryGetField<decimal>("Amount", out decimal amount))
				{
					result.Amount = amount;
				}

				return result;
			}
			catch (Exception ex)
			{
				throw new InvalidOperationException($"Error processing CSV file: {ex.Message}", ex);
			}
		}

		private async Task<ExpenseDocumentResult> ProcessExcelFileAsync(IFormFile file)
		{
			// Implementation will depend on the Excel library you choose
			// Similar logic to the CSV processing but using Excel libraries
			// For example, using EPPlus or ExcelDataReader

			// This is a placeholder - you'll need to implement the actual Excel processing
			throw new NotImplementedException("Excel processing to be implemented based on your preferred library");
		}
	}

	public class ExpenseDocumentResult
	{
		public int MissionId { get; set; }
		public string MissionIdString { get; set; } = string.Empty;
		public string MissionName { get; set; } = string.Empty;
		public string Client { get; set; } = string.Empty;
		public string Description { get; set; } = string.Empty;
		public decimal Amount { get; set; }
		public string Currency { get; set; } = string.Empty;
		public string Category { get; set; } = string.Empty;
		public string Status { get; set; } = string.Empty;
	}
}