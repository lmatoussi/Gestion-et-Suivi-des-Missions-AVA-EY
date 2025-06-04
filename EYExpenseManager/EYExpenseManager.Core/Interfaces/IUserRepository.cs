using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using EYExpenseManager.Core.Entities;

namespace EYExpenseManager.Core.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(int id);
        Task<User?> GetByEmailAsync(string email);
        Task<User?> GetByIdUserAsync(string idUser);
        Task<IEnumerable<User>> GetAllAsync();
        Task<User?> AddAsync(User user);
        Task UpdateAsync(User user);
        Task DeleteAsync(int id);
        Task<IEnumerable<User>> GetUsersByRoleAsync(Role role);
        Task<IEnumerable<User>> GetPendingVerificationsAsync();
        Task<User?> GetByGoogleIdAsync(string googleId);
    }
}
