using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EYExpenseManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveDocumentEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProfileImageContentType",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfileImageFileName",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProfileImagePath",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProfileImageContentType",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ProfileImageFileName",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ProfileImagePath",
                table: "Users");
        }
    }
}
