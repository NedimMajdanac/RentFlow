using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Deals;
using RentFlow.Domain.Enums;

namespace RentFlow.Domain.Entities.Finance;

public class RentInstallmentEntity : BaseEntity
{
    public int ContractId { get; set; }
    public ContractEntity Contract { get; set; } = null!;

    public DateOnly DueDate { get; set; }
    public decimal Amount { get; set; }
    public int CurrencyId { get; set; }
    public CurrencyEntity Currency { get; set; } = null!;

    public InstallmentStatus Status { get; set; } = InstallmentStatus.Unpaid;
}
