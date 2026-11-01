using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RentFlow.Domain.Common;
using RentFlow.Domain.Entities;

namespace RentFlow.Infrastructure.Configurations;

public class CityConfiguration : IEntityTypeConfiguration<CityEntity>
{
    public void Configure(EntityTypeBuilder<CityEntity> b)
    {
        b.ToTable("Cities");
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.PostalCode).HasMaxLength(20);
        b.Property(x => x.Region).HasMaxLength(100);
    }
}
