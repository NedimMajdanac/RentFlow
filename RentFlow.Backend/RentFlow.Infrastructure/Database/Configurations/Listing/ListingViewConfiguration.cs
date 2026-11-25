using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RentFlow.Domain.Entities;
using RentFlow.Domain.Entities.Listing;

namespace RentFlow.Infrastructure.Configurations.Listing;

public class ListingViewConfiguration : IEntityTypeConfiguration<ListingViewEntity>
{
    public void Configure(EntityTypeBuilder<ListingViewEntity> b)
    {
        b.ToTable("ListingViews");

        b.HasOne(x => x.Listing).WithMany()
            .HasForeignKey(x => x.ListingId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Viewer).WithMany()
            .HasForeignKey(x => x.ViewerId).OnDelete(DeleteBehavior.Restrict);

        // statistics (per listing, over time) and the "already counted today" check
        b.HasIndex(x => new { x.ListingId, x.CreatedAtUtc });
        b.HasIndex(x => new { x.ListingId, x.ViewerId, x.CreatedAtUtc });
    }
}