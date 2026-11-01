using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RentFlow.Domain.Entities.Property;

namespace RentFlow.Infrastructure.Configurations;

public class PropertyConfiguration : IEntityTypeConfiguration<PropertyEntity>
{
    public void Configure(EntityTypeBuilder<PropertyEntity> b)
    {
        b.ToTable("Properties");

        b.Property(x => x.Address).HasMaxLength(200).IsRequired();
        b.Property(x => x.Description).HasMaxLength(4000);
        b.Property(x => x.AreaM2).HasPrecision(10, 2);
        b.Property(x => x.PlotAreaM2).HasPrecision(12, 2);
        b.Property(x => x.Latitude).HasPrecision(9, 6);
        b.Property(x => x.Longitude).HasPrecision(9, 6);

        b.Property(x => x.PropertyType).HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.HeatingType).HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.FurnishedStatus).HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.Condition).HasConversion<string>().HasMaxLength(30);

        b.HasOne(x => x.Owner).WithMany()
            .HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.City).WithMany()
            .HasForeignKey(x => x.CityId).OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(x => new { x.CityId, x.PropertyType });
    }
}
