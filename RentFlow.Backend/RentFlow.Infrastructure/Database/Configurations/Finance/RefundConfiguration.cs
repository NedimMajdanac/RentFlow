using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RentFlow.Domain.Entities;
using RentFlow.Domain.Entities.Finance;

namespace RentFlow.Infrastructure.Configurations;

public class RefundConfiguration : IEntityTypeConfiguration<RefundEntity>
{
    public void Configure(EntityTypeBuilder<RefundEntity> b)
    {
        b.ToTable("Refunds");

        b.Property(x => x.Amount).HasPrecision(18, 2);
        b.Property(x => x.AppliedRate).HasPrecision(18, 6);
        b.Property(x => x.Reason).HasMaxLength(500);

        b.HasOne(x => x.Transaction).WithMany(t => t.Refunds)
            .HasForeignKey(x => x.TransactionId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Currency).WithMany()
            .HasForeignKey(x => x.CurrencyId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.ExchangeRate).WithMany()
            .HasForeignKey(x => x.ExchangeRateId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.CreatedBy).WithMany()
            .HasForeignKey(x => x.CreatedById).OnDelete(DeleteBehavior.Restrict);
    }
}
