using EYExpenseManager.Core.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;

namespace EYExpenseManager.Infrastructure.Data
{
    public static class DbInitializer
    {
        public static void Initialize(ApplicationDbContext context)
        {
            context.Database.EnsureCreated();

            if (context.Users.Any()) return;

            var users = new[]
            {
            new User
            {
                IdUser = "admin",
                NameUser = "Admin",
                Surname = "User",
                Email = "admin@example.com",
                Password = HashPassword("Admin123*"),
                Role = Role.Admin,
                //Enabled = true,
                Gpn = "GPN001"
            }
        };

            context.Users.AddRange(users);
            context.SaveChanges();
        }

        // In DbInitializer.cs
        private static string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password); // Use BCrypt instead of SHA256
        }

    }

}
