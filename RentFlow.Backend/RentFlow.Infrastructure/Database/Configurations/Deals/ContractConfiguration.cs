using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RentFlow.Domain.Entities;
using RentFlow.Domain.Entities.Deals;

namespace RentFlow.Infrastructure.Configurations;

public class ContractConfiguration : IEntityTypeConfiguration<ContractEntity>
{
    public void Configure(EntityTypeBuilder<ContractEntity> b)
    {
        b.ToTable("Contracts");

        b.Property(x => x.Amount).HasPrecision(18, 2);
        b.Property(x => x.PdfPath).HasMaxLength(500);
        b.Property(x => x.ContractType).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);

        b.HasOne(x => x.Request).WithOne()
            .HasForeignKey<ContractEntity>(x => x.RequestId).OnDelete(DeleteBehavior.Restrict);
        b.HasIndex(x => x.RequestId).IsUnique();

        b.HasOne(x => x.SellerOrLandlord).WithMany()
            .HasForeignKey(x => x.SellerOrLandlordId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.BuyerOrTenant).WithMany()
            .HasForeignKey(x => x.BuyerOrTenantId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Currency).WithMany()
            .HasForeignKey(x => x.CurrencyId).OnDelete(DeleteBehavior.Restrict);
    }
}
