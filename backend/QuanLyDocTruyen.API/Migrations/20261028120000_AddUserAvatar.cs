using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuanLyDocTruyen.API.Data;

#nullable disable

namespace QuanLyDocTruyen.API.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261028120000_AddUserAvatar")]
public partial class AddUserAvatar : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) =>
        migrationBuilder.AddColumn<string>(
            name: "AvatarUrl",
            table: "Users",
            type: "nvarchar(max)",
            nullable: true);

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.DropColumn(name: "AvatarUrl", table: "Users");
}
