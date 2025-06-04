using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.Collections.Generic;
using EYExpenseManager.Application.Services.Expense;
using EYExpenseManager.Application.DTOs.Expense;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using System;
using Microsoft.AspNetCore.Http;
using EYExpenseManager.Application.Services;

namespace EYExpenseManager.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExpenseController : ControllerBase
    {
        private readonly IExpenseService _expenseService;

        public ExpenseController(IExpenseService expenseService)
        {
            _expenseService = expenseService;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ExpenseResponseDto>> GetById(int id)
        {
            try
            {
                var expense = await _expenseService.GetByIdAsync(id);
                return Ok(expense);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ExpenseResponseDto>>> GetAll()
        {
            var expenses = await _expenseService.GetAllExpensesAsync();
            return Ok(expenses);
        }

        [HttpPost]
        public async Task<ActionResult<ExpenseResponseDto>> Create(ExpenseCreateDto expenseDto)
        {
            try
            {
                var createdExpense = await _expenseService.CreateExpenseAsync(expenseDto);
                return CreatedAtAction(nameof(GetById),
                    new { id = createdExpense.Id },
                    createdExpense);
            }
            catch (ValidationException ex)
            {
                return BadRequest(ex.Errors);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, "Database error: " + ex.InnerException?.Message);
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, ExpenseUpdateDto expenseDto)
        {
            if (id != expenseDto.Id)
                return BadRequest("ID mismatch");

            try
            {
                await _expenseService.UpdateExpenseAsync(expenseDto);
                return NoContent();
            }
            catch (ValidationException ex)
            {
                return BadRequest(ex.Errors);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _expenseService.DeleteExpenseAsync(id);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpGet("mission/{missionId}")]
        public async Task<ActionResult<IEnumerable<ExpenseResponseDto>>> GetByMissionId(int missionId)
        {
            var expenses = await _expenseService.GetExpensesByMissionIdAsync(missionId);
            return Ok(expenses);
        }

        [HttpGet("status/{status}")]
        public async Task<ActionResult<IEnumerable<ExpenseResponseDto>>> GetByStatus(string status)
        {
            var expenses = await _expenseService.GetExpensesByStatusAsync(status);
            return Ok(expenses);
        }

        [HttpGet("category/{category}")]
        public async Task<ActionResult<IEnumerable<ExpenseResponseDto>>> GetByCategory(string category)
        {
            var expenses = await _expenseService.GetExpensesByCategoryAsync(category);
            return Ok(expenses);
        }

        [HttpGet("mission/{missionId}/total")]
        public async Task<ActionResult<decimal>> GetTotalExpenseByMission(int missionId)
        {
            var totalExpense = await _expenseService.GetTotalExpenseAmountByMissionAsync(missionId);
            return Ok(totalExpense);
        }

        // New endpoints for document processing
        [HttpPost("upload-document")]
        public async Task<ActionResult<ExpenseDocumentResult>> UploadDocument(IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                    return BadRequest("No file was uploaded.");

                var result = await _expenseService.ProcessExpenseDocumentAsync(file);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error processing document: {ex.Message}");
            }
        }

        [HttpPost("create-from-document")]
        public async Task<ActionResult<ExpenseResponseDto>> CreateFromDocument([FromForm] ExpenseCreateFromDocumentDto dto)
        {
            try
            {
                // If document is included, process it first to get mission data
                if (dto.DocumentFile != null)
                {
                    var documentResult = await _expenseService.ProcessExpenseDocumentAsync(dto.DocumentFile);

                    // Only override empty values with values from the document
                    if (dto.MissionId == 0)
                        dto.MissionId = documentResult.MissionId;

                    if (string.IsNullOrEmpty(dto.Description))
                        dto.Description = documentResult.Description;

                    if (dto.Amount == 0)
                        dto.Amount = documentResult.Amount;

                    if (string.IsNullOrEmpty(dto.Currency))
                        dto.Currency = documentResult.Currency;

                    if (string.IsNullOrEmpty(dto.Category))
                        dto.Category = documentResult.Category;

                    if (string.IsNullOrEmpty(dto.Status))
                        dto.Status = documentResult.Status;
                }

                var result = await _expenseService.CreateExpenseFromDocumentAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error creating expense: {ex.Message}");
            }
        }
    }
}