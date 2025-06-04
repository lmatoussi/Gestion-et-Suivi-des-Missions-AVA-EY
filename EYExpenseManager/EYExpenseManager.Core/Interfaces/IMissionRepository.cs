using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EYExpenseManager.Core.Entities;

namespace EYExpenseManager.Core.Interfaces
{
    public interface IMissionRepository
    {
        Task<Mission> GetByIdAsync(int id);
        Task<Mission> GetByIdMissionAsync(string idMission);
        Task<IEnumerable<Mission>> GetAllAsync();
        Task<Mission> AddAsync(Mission mission);
        Task UpdateAsync(Mission mission);
        Task DeleteAsync(int id);
        Task<IEnumerable<Mission>> GetMissionsByClientAsync(string client);
        Task<IEnumerable<Mission>> GetMissionsByStatusAsync(string status);
        Task<IEnumerable<Mission>> GetMissionsByAssocierAsync(int associerId);
    }
}