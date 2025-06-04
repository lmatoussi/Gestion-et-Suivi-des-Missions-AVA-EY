using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EYExpenseManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveMfaEnabled : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MfaEnabled",
                table: "Users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "MfaEnabled",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
