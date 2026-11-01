using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RentFlow.Domain.Entities.Property;

namespace RentFlow.Infrastructure.Configurations;

public class AmenityConfiguration : IEntityTypeConfiguration<AmenityEntity>
{
    public void Configure(EntityTypeBuilder<AmenityEntity> b)
    {
        b.ToTable("Amenities");
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.Name).IsUnique().HasFilter("[IsDeleted] = 0");
    }
}
