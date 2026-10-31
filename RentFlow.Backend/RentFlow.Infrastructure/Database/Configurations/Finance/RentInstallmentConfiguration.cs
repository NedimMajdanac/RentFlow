using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RentFlow.Domain.Entities;
using RentFlow.Domain.Entities.Finance;

namespace RentFlow.Infrastructure.Configurations;

public class RentInstallmentConfiguration : IEntityTypeConfiguration<RentInstallmentEntity>
{
    public void Configure(EntityTypeBuilder<RentInstallmentEntity> b)
    {
        b.ToTable("RentInstallments");

        b.Property(x => x.Amount).HasPrecision(18, 2);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);

        b.HasOne(x => x.Contract).WithMany(c => c.Installments)
            .HasForeignKey(x => x.ContractId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Currency).WithMany()
            .HasForeignKey(x => x.CurrencyId).OnDelete(DeleteBehavior.Restrict);

        b.HasIndex(x => new { x.ContractId, x.DueDate });
    }
}
