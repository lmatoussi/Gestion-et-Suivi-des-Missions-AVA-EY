using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using EYExpenseManager.Core.Entities;
using EYExpenseManager.Core.Interfaces;
using EYExpenseManager.Infrastructure.Data;
using System.Linq;

namespace EYExpenseManager.Infrastructure.Repositories
{
    public class ExpenseRepository : IExpenseRepository
    {
        private readonly ApplicationDbContext _context;

        public ExpenseRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Expense> GetByIdAsync(int id)
        {
            return await _context.Expenses
                .Include(e => e.Mission)
                .FirstOrDefaultAsync(e => e.Id == id);
        }

        public async Task<IEnumerable<Expense>> GetAllAsync()
        {
            return await _context.Expenses
                .Include(e => e.Mission)
                .ToListAsync();
        }

        public async Task<Expense> AddAsync(Expense expense)
        {
            await _context.Expenses.AddAsync(expense);
            await _context.SaveChangesAsync();
            return expense;
        }

        public async Task UpdateAsync(Expense expense)
        {
            _context.Expenses.Update(expense);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var expense = await _context.Expenses.FindAsync(id);
            if (expense != null)
            {
                _context.Expenses.Remove(expense);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<Expense>> GetExpensesByMissionIdAsync(int missionId)
        {
            return await _context.Expenses
                .Where(e => e.MissionId == missionId)
                .Include(e => e.Mission)
                .ToListAsync();
        }

        public async Task<IEnumerable<Expense>> GetExpensesByStatusAsync(string status)
        {
            return await _context.Expenses
                .Where(e => e.Status == status)
                .Include(e => e.Mission)
                .ToListAsync();
        }

        public async Task<IEnumerable<Expense>> GetExpensesByCategoryAsync(string category)
        {
            return await _context.Expenses
                .Where(e => e.Category == category)
                .Include(e => e.Mission)
                .ToListAsync();
        }

        public async Task<decimal> GetTotalExpenseAmountByMissionAsync(int missionId)
        {
            return await _context.Expenses
                .Where(e => e.MissionId == missionId)
                .SumAsync(e => e.ConvertedAmount);
        }
    }
}