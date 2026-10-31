using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RentFlow.Domain.Entities;
using RentFlow.Domain.Entities.Listing;

namespace RentFlow.Infrastructure.Configurations;

public class FavoriteConfiguration : IEntityTypeConfiguration<FavoriteEntity>
{
    public void Configure(EntityTypeBuilder<FavoriteEntity> b)
    {
        b.ToTable("Favorites");

        b.HasOne(x => x.User).WithMany(x => x.FavoriteListings)
            .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.Listing).WithMany()
            .HasForeignKey(x => x.ListingId).OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(x => new { x.UserId, x.ListingId })
            .IsUnique().HasFilter("[IsDeleted] = 0");
    }
}
