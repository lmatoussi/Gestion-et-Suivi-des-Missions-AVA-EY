using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using EYExpenseManager.Core.Entities;
using EYExpenseManager.Core.Interfaces;
using EYExpenseManager.Infrastructure.Data;

namespace EYExpenseManager.Infrastructure.Repositories
{
    public class MissionRepository : IMissionRepository
    {
        private readonly ApplicationDbContext _context;

        public MissionRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Mission> GetByIdAsync(int id)
        {
            return await _context.Missions
                .Include(m => m.Associer)
                .Include(m => m.Employes)
                .Include(m => m.Expenses)
                .FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<Mission> GetByIdMissionAsync(string idMission)
        {
            return await _context.Missions
                .Include(m => m.Associer)
                .Include(m => m.Employes)
                .Include(m => m.Expenses)
                .FirstOrDefaultAsync(m => m.IdMission == idMission);
        }

        public async Task<IEnumerable<Mission>> GetAllAsync()
        {
            return await _context.Missions
                .Include(m => m.Associer)
                .Include(m => m.Employes)
                .Include(m => m.Expenses)
                .ToListAsync();
        }

        public async Task<Mission> AddAsync(Mission mission)
        {
            await _context.Missions.AddAsync(mission);
            await _context.SaveChangesAsync();
            return mission;
        }

        public async Task UpdateAsync(Mission mission)
        {
            _context.Missions.Update(mission);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var mission = await _context.Missions.FindAsync(id);
            if (mission != null)
            {
                _context.Missions.Remove(mission);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<Mission>> GetMissionsByClientAsync(string client)
        {
            return await _context.Missions
                .Where(m => m.Client == client)
                .Include(m => m.Associer)
                .Include(m => m.Employes)
                .Include(m => m.Expenses)
                .ToListAsync();
        }

        public async Task<IEnumerable<Mission>> GetMissionsByStatusAsync(string status)
        {
            return await _context.Missions
                .Where(m => m.Status == status)
                .Include(m => m.Associer)
                .Include(m => m.Employes)
                .Include(m => m.Expenses)
                .ToListAsync();
        }

        public async Task<IEnumerable<Mission>> GetMissionsByAssocierAsync(int associerId)
        {
            return await _context.Missions
                .Where(m => m.Associer != null && m.Associer.Id == associerId)
                .Include(m => m.Associer)
                .Include(m => m.Employes)
                .Include(m => m.Expenses)
                .ToListAsync();
        }
    }
}