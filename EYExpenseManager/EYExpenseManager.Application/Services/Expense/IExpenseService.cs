using AutoMapper;
using FluentValidation;
using EYExpenseManager.Core.Interfaces;
using EYExpenseManager.Application.DTOs.Expense;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using EYExpenseManager.Core.Entities;
using Microsoft.AspNetCore.Http;
using EYExpenseManager.Application.Services;

namespace EYExpenseManager.Application.Services.Expense
{
    public interface IExpenseService
    {
        Task<ExpenseResponseDto> CreateExpenseAsync(ExpenseCreateDto expenseDto);
        Task<ExpenseResponseDto> UpdateExpenseAsync(ExpenseUpdateDto expenseDto);
        Task<ExpenseResponseDto> GetByIdAsync(int id);
        Task<IEnumerable<ExpenseResponseDto>> GetAllExpensesAsync();
        Task<IEnumerable<ExpenseResponseDto>> GetExpensesByMissionIdAsync(int missionId);
        Task<IEnumerable<ExpenseResponseDto>> GetExpensesByStatusAsync(string status);
        Task<IEnumerable<ExpenseResponseDto>> GetExpensesByCategoryAsync(string category);
        Task<decimal> GetTotalExpenseAmountByMissionAsync(int missionId);
        Task DeleteExpenseAsync(int id);

        // New methods for document processing
        Task<ExpenseDocumentResult> ProcessExpenseDocumentAsync(IFormFile file);
        Task<ExpenseResponseDto> CreateExpenseFromDocumentAsync(ExpenseCreateFromDocumentDto expenseDto);
    }

    public class ExpenseService : IExpenseService
    {
        private readonly IExpenseRepository _expenseRepository;
        private readonly IMissionRepository _missionRepository;
        private readonly IMapper _mapper;
        private readonly IValidator<ExpenseCreateDto> _createValidator;
        private readonly IValidator<ExpenseUpdateDto> _updateValidator;
        private readonly IDocumentProcessingService _documentProcessingService;

        public ExpenseService(
            IExpenseRepository expenseRepository,
            IMissionRepository missionRepository,
            IMapper mapper,
            IValidator<ExpenseCreateDto> createValidator,
            IValidator<ExpenseUpdateDto> updateValidator,
            IDocumentProcessingService documentProcessingService)
        {
            _expenseRepository = expenseRepository;
            _missionRepository = missionRepository;
            _mapper = mapper;
            _createValidator = createValidator;
            _updateValidator = updateValidator;
            _documentProcessingService = documentProcessingService;
        }

        public async Task<ExpenseResponseDto> CreateExpenseAsync(ExpenseCreateDto expenseDto)
        {
            // Validate input
            var validationResult = await _createValidator.ValidateAsync(expenseDto);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            // Verify mission exists
            var mission = await _missionRepository.GetByIdAsync(expenseDto.MissionId);
            if (mission == null)
                throw new InvalidOperationException($"Mission with ID {expenseDto.MissionId} not found");

            // Map and create expense
            var expense = _mapper.Map<EYExpenseManager.Core.Entities.Expense>(expenseDto);
            expense.CreatedDate = DateTime.UtcNow;

            var createdExpense = await _expenseRepository.AddAsync(expense);

            // Map to response DTO with mission name
            var responseDto = _mapper.Map<ExpenseResponseDto>(createdExpense);
            responseDto.MissionName = mission.NomDeContract;

            return responseDto;
        }

        public async Task<ExpenseResponseDto> UpdateExpenseAsync(ExpenseUpdateDto expenseDto)
        {
            // Validate input
            var validationResult = await _updateValidator.ValidateAsync(expenseDto);
            if (!validationResult.IsValid)
                throw new ValidationException(validationResult.Errors);

            // Verify expense exists
            var existingExpense = await _expenseRepository.GetByIdAsync(expenseDto.Id);
            if (existingExpense == null)
                throw new InvalidOperationException($"Expense with ID {expenseDto.Id} not found");

            // Verify mission exists if missionId is provided
            if (expenseDto.MissionId.HasValue && expenseDto.MissionId.Value != existingExpense.MissionId)
            {
                var mission = await _missionRepository.GetByIdAsync(expenseDto.MissionId.Value);
                if (mission == null)
                    throw new InvalidOperationException($"Mission with ID {expenseDto.MissionId.Value} not found");
            }

            // Update fields explicitly to handle nulls
            if (expenseDto.MissionId.HasValue)
                existingExpense.MissionId = expenseDto.MissionId.Value;

            if (expenseDto.Description != null)
                existingExpense.Description = expenseDto.Description;

            if (expenseDto.Amount.HasValue)
                existingExpense.Amount = expenseDto.Amount.Value;

            if (expenseDto.Currency != null)
                existingExpense.Currency = expenseDto.Currency;

            if (expenseDto.ConvertedAmount.HasValue)
                existingExpense.ConvertedAmount = expenseDto.ConvertedAmount.Value;

            if (expenseDto.ExpenseDate.HasValue)
                existingExpense.ExpenseDate = expenseDto.ExpenseDate.Value;

            if (expenseDto.Category != null)
                existingExpense.Category = expenseDto.Category;

            if (expenseDto.ReceiptUrl != null)
                existingExpense.ReceiptUrl = expenseDto.ReceiptUrl;

            if (expenseDto.Status != null)
                existingExpense.Status = expenseDto.Status;

            await _expenseRepository.UpdateAsync(existingExpense);

            // Get updated expense with mission included
            var updatedExpense = await _expenseRepository.GetByIdAsync(existingExpense.Id);
            var responseDto = _mapper.Map<ExpenseResponseDto>(updatedExpense);
            responseDto.MissionName = updatedExpense.Mission?.NomDeContract ?? string.Empty;

            return responseDto;
        }

        public async Task<ExpenseResponseDto> GetByIdAsync(int id)
        {
            var expense = await _expenseRepository.GetByIdAsync(id);
            if (expense == null)
                throw new InvalidOperationException($"Expense with ID {id} not found");

            var responseDto = _mapper.Map<ExpenseResponseDto>(expense);
            responseDto.MissionName = expense.Mission?.NomDeContract ?? string.Empty;

            return responseDto;
        }

        public async Task<IEnumerable<ExpenseResponseDto>> GetAllExpensesAsync()
        {
            var expenses = await _expenseRepository.GetAllAsync();
            return _mapper.Map<IEnumerable<ExpenseResponseDto>>(expenses);
        }

        public async Task<IEnumerable<ExpenseResponseDto>> GetExpensesByMissionIdAsync(int missionId)
        {
            var expenses = await _expenseRepository.GetExpensesByMissionIdAsync(missionId);
            return _mapper.Map<IEnumerable<ExpenseResponseDto>>(expenses);
        }

        public async Task<IEnumerable<ExpenseResponseDto>> GetExpensesByStatusAsync(string status)
        {
            var expenses = await _expenseRepository.GetExpensesByStatusAsync(status);
            return _mapper.Map<IEnumerable<ExpenseResponseDto>>(expenses);
        }

        public async Task<IEnumerable<ExpenseResponseDto>> GetExpensesByCategoryAsync(string category)
        {
            var expenses = await _expenseRepository.GetExpensesByCategoryAsync(category);
            return _mapper.Map<IEnumerable<ExpenseResponseDto>>(expenses);
        }

        public async Task<decimal> GetTotalExpenseAmountByMissionAsync(int missionId)
        {
            return await _expenseRepository.GetTotalExpenseAmountByMissionAsync(missionId);
        }

        public async Task DeleteExpenseAsync(int id)
        {
            try
            {
                await _expenseRepository.DeleteAsync(id);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to delete expense: {ex.Message}");
            }
        }

        // New methods for document processing
        public async Task<ExpenseDocumentResult> ProcessExpenseDocumentAsync(IFormFile file)
        {
            return await _documentProcessingService.ProcessExpenseDocumentAsync(file);
        }

        public async Task<ExpenseResponseDto> CreateExpenseFromDocumentAsync(ExpenseCreateFromDocumentDto expenseDto)
        {
            // Validate that the mission exists
            var mission = await _missionRepository.GetByIdAsync(expenseDto.MissionId);
            if (mission == null)
                throw new InvalidOperationException($"Mission with ID {expenseDto.MissionId} not found");

            // Create a regular ExpenseCreateDto from the document data + user modifications
            var createDto = new ExpenseCreateDto
            {
                MissionId = expenseDto.MissionId,
                Description = expenseDto.Description,
                Amount = expenseDto.Amount,
                Currency = expenseDto.Currency,
                ConvertedAmount = expenseDto.ConvertedAmount,
                ExpenseDate = expenseDto.ExpenseDate,
                Category = expenseDto.Category,
                ReceiptUrl = expenseDto.ReceiptUrl,
                Status = expenseDto.Status,
                CreatedBy = expenseDto.CreatedBy
            };

            // Use the existing create method
            return await CreateExpenseAsync(createDto);
        }
    }
}