using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuanLyDocTruyen.API.Data;

#nullable disable

namespace QuanLyDocTruyen.API.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261028130000_StoreUserAvatarsInDatabase")]
public partial class StoreUserAvatarsInDatabase : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "UserAvatars",
            columns: table => new
            {
                UserId = table.Column<int>(type: "int", nullable: false),
                ImageData = table.Column<byte[]>(type: "varbinary(max)", nullable: false),
                ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_UserAvatars", x => x.UserId);
                table.ForeignKey(
                    name: "FK_UserAvatars_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.DropTable(name: "UserAvatars");
}
