using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RentFlow.Domain.Entities.Listing;

namespace RentFlow.Infrastructure.Configurations;

public class ListingConfiguration : IEntityTypeConfiguration<ListingEntity>
{
    public void Configure(EntityTypeBuilder<ListingEntity> b)
    {
        b.ToTable("Listings");

        b.Property(x => x.Title).HasMaxLength(200).IsRequired();
        b.Property(x => x.Price).HasPrecision(18, 2);
        b.Property(x => x.Deposit).HasPrecision(18, 2);
        b.Property(x => x.ListingType).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);

        b.HasOne(x => x.Property).WithMany(p => p.Listings)
            .HasForeignKey(x => x.PropertyId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Currency).WithMany()
            .HasForeignKey(x => x.CurrencyId).OnDelete(DeleteBehavior.Restrict);

        // samo jedan aktivan (neobrisan) oglas po nekretnini
        b.HasIndex(x => x.PropertyId)
            .IsUnique()
            .HasFilter("[Status] = 'Active' AND [IsDeleted] = 0");

        // pretraga oglasa
        b.HasIndex(x => new { x.Status, x.ListingType });
    }
}
