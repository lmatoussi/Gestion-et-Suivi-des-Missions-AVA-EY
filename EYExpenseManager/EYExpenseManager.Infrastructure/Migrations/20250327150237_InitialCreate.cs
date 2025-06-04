using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EYExpenseManager.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Expenses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MissionId = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    ConvertedAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ExpenseDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ReceiptUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Expenses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Missions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdMission = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NomDeContract = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Client = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DateSignature = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EngagementCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Pays = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    MontantDevise = table.Column<double>(type: "float", nullable: false),
                    MontantTnd = table.Column<double>(type: "float", nullable: false),
                    Ava = table.Column<double>(type: "float", nullable: false),
                    AssocierId = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Missions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdUser = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NameUser = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Surname = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Password = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MfaEnabled = table.Column<bool>(type: "bit", nullable: false),
                    Secret = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    Enabled = table.Column<bool>(type: "bit", nullable: false),
                    Gpn = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    MissionId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Missions_MissionId",
                        column: x => x.MissionId,
                        principalTable: "Missions",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Expenses_MissionId",
                table: "Expenses",
                column: "MissionId");

            migrationBuilder.CreateIndex(
                name: "IX_Missions_AssocierId",
                table: "Missions",
                column: "AssocierId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_IdUser",
                table: "Users",
                column: "IdUser",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_MissionId",
                table: "Users",
                column: "MissionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Expenses_Missions_MissionId",
                table: "Expenses",
                column: "MissionId",
                principalTable: "Missions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Missions_Users_AssocierId",
                table: "Missions",
                column: "AssocierId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Missions_MissionId",
                table: "Users");

            migrationBuilder.DropTable(
                name: "Expenses");

            migrationBuilder.DropTable(
                name: "Missions");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
