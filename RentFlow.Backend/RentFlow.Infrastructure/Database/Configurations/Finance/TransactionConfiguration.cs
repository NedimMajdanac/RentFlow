using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RentFlow.Domain.Entities;
using RentFlow.Domain.Entities.Finance;

namespace RentFlow.Infrastructure.Configurations;

public class TransactionConfiguration : IEntityTypeConfiguration<TransactionEntity>
{
    public void Configure(EntityTypeBuilder<TransactionEntity> b)
    {
        b.ToTable("Transactions");

        b.Property(x => x.OriginalAmount).HasPrecision(18, 2);
        b.Property(x => x.PaidAmount).HasPrecision(18, 2);
        b.Property(x => x.AppliedRate).HasPrecision(18, 6);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);

        b.HasOne(x => x.Contract).WithMany(c => c.Transactions)
            .HasForeignKey(x => x.ContractId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Installment).WithMany()
            .HasForeignKey(x => x.InstallmentId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Payer).WithMany()
            .HasForeignKey(x => x.PayerId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.RecordedBy).WithMany()
            .HasForeignKey(x => x.RecordedById).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.OriginalCurrency).WithMany()
            .HasForeignKey(x => x.OriginalCurrencyId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.PaidCurrency).WithMany()
            .HasForeignKey(x => x.PaidCurrencyId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.ExchangeRate).WithMany()
            .HasForeignKey(x => x.ExchangeRateId).OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(x => x.ContractId);
        b.HasIndex(x => x.InstallmentId);
    }
}
