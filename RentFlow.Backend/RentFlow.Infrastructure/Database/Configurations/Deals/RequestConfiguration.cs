using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RentFlow.Domain.Entities;
using RentFlow.Domain.Entities.Deals;

namespace RentFlow.Infrastructure.Configurations;

public class RequestConfiguration : IEntityTypeConfiguration<RequestEntity>
{
    public void Configure(EntityTypeBuilder<RequestEntity> b)
    {
        b.ToTable("Requests");

        b.Property(x => x.Message).HasMaxLength(2000);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);

        b.HasOne(x => x.Listing).WithMany(l => l.Requests)
            .HasForeignKey(x => x.ListingId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Requester).WithMany()
            .HasForeignKey(x => x.RequesterId).OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(x => new { x.ListingId, x.Status });
    }
}
