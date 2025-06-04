using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using EYExpenseManager.Infrastructure.Data;
using EYExpenseManager.Core.Interfaces;
using EYExpenseManager.Infrastructure.Repositories;

namespace EYExpenseManager.Infrastructure.Extensions
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
        {
            // Configure database context
            services.AddDbContext<ApplicationDbContext>(options =>
                options.UseSqlServer(connectionString));

            // Register repositories
            services.AddScoped<IMissionRepository, MissionRepository>();
            services.AddScoped<IExpenseRepository, ExpenseRepository>();
            services.AddScoped<IUserRepository, UserRepository>();

            return services;
        }
    }
}