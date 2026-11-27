using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RentFlow.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddListingLifecycleGuards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Listings_PropertyId",
                table: "Listings");

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Listings",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.CreateIndex(
                name: "IX_Listings_PropertyId",
                table: "Listings",
                column: "PropertyId",
                unique: true,
                filter: "[Status] <> 'Closed' AND [IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Listings_PropertyId",
                table: "Listings");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Listings");

            migrationBuilder.CreateIndex(
                name: "IX_Listings_PropertyId",
                table: "Listings",
                column: "PropertyId",
                unique: true,
                filter: "[Status] = 'Active' AND [IsDeleted] = 0");
        }
    }
}
