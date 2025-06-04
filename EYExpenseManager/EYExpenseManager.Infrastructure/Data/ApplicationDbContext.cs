using Microsoft.EntityFrameworkCore;
using EYExpenseManager.Core.Entities;
using EYExpenseManager.Infrastructure.Data;


namespace EYExpenseManager.Infrastructure.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Mission> Missions { get; set; }
        public DbSet<Expense> Expenses { get; set; }
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Mission-Expense Relationship
            modelBuilder.Entity<Mission>()
                .HasMany(m => m.Expenses)
                .WithOne(e => e.Mission)
                .HasForeignKey(e => e.MissionId)
                .OnDelete(DeleteBehavior.Cascade);

            // Mission-Associer Relationship
            modelBuilder.Entity<Mission>()
     .HasOne(m => m.Associer)
     .WithMany()
     .HasForeignKey(m => m.AssocierId)
     .OnDelete(DeleteBehavior.SetNull);


            // Unique Indexes
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasIndex(u => u.IdUser)
                .IsUnique();

            // Precision for monetary fields
            modelBuilder.Entity<Expense>()
                .Property(e => e.Amount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Expense>()
                .Property(e => e.ConvertedAmount)
                .HasPrecision(18, 2);

           
        }
    }
}
