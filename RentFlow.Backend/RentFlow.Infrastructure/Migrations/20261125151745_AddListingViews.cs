using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RentFlow.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddListingViews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ListingViews",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ListingId = table.Column<int>(type: "int", nullable: false),
                    ViewerId = table.Column<int>(type: "int", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ModifiedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListingViews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ListingViews_Listings_ListingId",
                        column: x => x.ListingId,
                        principalTable: "Listings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ListingViews_Users_ViewerId",
                        column: x => x.ViewerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ListingViews_ListingId_CreatedAtUtc",
                table: "ListingViews",
                columns: new[] { "ListingId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ListingViews_ListingId_ViewerId_CreatedAtUtc",
                table: "ListingViews",
                columns: new[] { "ListingId", "ViewerId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_ListingViews_ViewerId",
                table: "ListingViews",
                column: "ViewerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ListingViews");
        }
    }
}
