using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EYExpenseManager.Core.Entities;

namespace EYExpenseManager.Core.Interfaces
{
    public interface IExpenseRepository
    {
        Task<Expense> GetByIdAsync(int id);
        Task<IEnumerable<Expense>> GetAllAsync();
        Task<Expense> AddAsync(Expense expense);
        Task UpdateAsync(Expense expense);
        Task DeleteAsync(int id);
        Task<IEnumerable<Expense>> GetExpensesByMissionIdAsync(int missionId);
        Task<IEnumerable<Expense>> GetExpensesByStatusAsync(string status);
        Task<IEnumerable<Expense>> GetExpensesByCategoryAsync(string category);
        Task<decimal> GetTotalExpenseAmountByMissionAsync(int missionId);
    }
}