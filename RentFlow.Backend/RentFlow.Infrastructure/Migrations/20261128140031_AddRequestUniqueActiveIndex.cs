using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RentFlow.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRequestUniqueActiveIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Requests_ListingId_RequesterId",
                table: "Requests",
                columns: new[] { "ListingId", "RequesterId" },
                unique: true,
                filter: "[Status] IN ('Pending', 'Accepted') AND [IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Requests_ListingId_RequesterId",
                table: "Requests");
        }
    }
}
