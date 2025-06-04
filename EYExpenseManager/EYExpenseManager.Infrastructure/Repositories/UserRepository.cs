using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using EYExpenseManager.Core.Entities;
using EYExpenseManager.Core.Interfaces;
using System.Linq;
using EYExpenseManager.Application.Helpers;
using EYExpenseManager.Infrastructure.Data;

namespace EYExpenseManager.Infrastructure.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _context;

        public UserRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            return await _context.Users.FindAsync(id);
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            var normalizedEmail = email.Trim().ToLower();
            return await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        }

        public async Task<User?> GetByIdUserAsync(string idUser)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.IdUser == idUser);
        }

        public async Task<IEnumerable<User>> GetAllAsync()
        {
            return await _context.Users.ToListAsync();
        }

        public async Task<User?> AddAsync(User user)
        {
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
            return user;
        }

        public async Task UpdateAsync(User user)
        {
            var existingUser = await _context.Users.FindAsync(user.Id);
            if (existingUser != null)
            {
                existingUser.NameUser = user.NameUser;
                existingUser.Surname = user.Surname;
                existingUser.Email = user.Email;
                existingUser.Role = user.Role;
                existingUser.Enabled = user.Enabled;
                existingUser.Gpn = user.Gpn;

                if (!string.IsNullOrEmpty(user.Password))
                {
                    // Use centralized password helper
                    existingUser.Password = PasswordHelper.HashPassword(user.Password);
                }

                await _context.SaveChangesAsync();
            }
        }

        public async Task DeleteAsync(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user != null)
            {
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<User>> GetUsersByRoleAsync(Role role)
        {
            return await _context.Users
                .Where(u => u.Role == role)
                .ToListAsync();
        }

        public async Task<IEnumerable<User>> GetPendingVerificationsAsync()
        {
            return await _context.Users
                .Where(u => !u.EmailVerified && u.VerificationToken != null)
                .ToListAsync();
        }

        public async Task<User?> GetByGoogleIdAsync(string googleId)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.GoogleId == googleId);
        }

        // Removed local HashPassword/VerifyPassword methods
    }
}
