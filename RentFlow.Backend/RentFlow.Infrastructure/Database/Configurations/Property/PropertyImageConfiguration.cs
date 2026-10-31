using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RentFlow.Domain.Entities.Property;

namespace RentFlow.Infrastructure.Configurations;

public class PropertyImageConfiguration : IEntityTypeConfiguration<PropertyImageEntity>
{
    public void Configure(EntityTypeBuilder<PropertyImageEntity> b)
    {
        b.ToTable("PropertyImages");
        b.Property(x => x.Url).HasMaxLength(500).IsRequired();

        // jedini cascade u modelu
        b.HasOne(x => x.Property).WithMany(p => p.Images)
            .HasForeignKey(x => x.PropertyId).OnDelete(DeleteBehavior.Cascade);
    }
}
