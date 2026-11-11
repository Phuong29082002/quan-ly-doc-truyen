using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using QuanLyDocTruyen.API.Data;

#nullable disable

namespace QuanLyDocTruyen.API.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261111090000_AddPackageSwitching")]
public partial class AddPackageSwitching : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(name: "IsPaused", table: "UserPackages", type: "bit", nullable: false, defaultValue: false);
        migrationBuilder.AddColumn<int>(name: "RemainingDays", table: "UserPackages", type: "int", nullable: false, defaultValue: 0);
        migrationBuilder.AddColumn<string>(name: "PackageMode", table: "Transactions", type: "nvarchar(max)", nullable: true);
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "IsPaused", table: "UserPackages");
        migrationBuilder.DropColumn(name: "RemainingDays", table: "UserPackages");
        migrationBuilder.DropColumn(name: "PackageMode", table: "Transactions");
    }
}
