using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RentFlow.Domain.Entities.Property;

namespace RentFlow.Infrastructure.Configurations;

public class PropertyAmenityConfiguration : IEntityTypeConfiguration<PropertyAmenityEntity>
{
    public void Configure(EntityTypeBuilder<PropertyAmenityEntity> b)
    {
        b.ToTable("PropertyAmenities");

        b.HasOne(x => x.Property).WithMany(p => p.Amenities)
            .HasForeignKey(x => x.PropertyId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Amenity).WithMany()
            .HasForeignKey(x => x.AmenityId).OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(x => new { x.PropertyId, x.AmenityId })
            .IsUnique().HasFilter("[IsDeleted] = 0");
    }
}
