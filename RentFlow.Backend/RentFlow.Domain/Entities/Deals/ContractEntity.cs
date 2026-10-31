using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Finance;
using RentFlow.Domain.Entities.Identity;
using RentFlow.Domain.Enums;

namespace RentFlow.Domain.Entities.Deals;

public class ContractEntity : BaseEntity
{
    public int RequestId { get; set; }
    public RequestEntity Request { get; set; } = null!;

    public ContractType ContractType { get; set; }

    public int SellerOrLandlordId { get; set; }
    public UserEntity SellerOrLandlord { get; set; } = null!;

    public int BuyerOrTenantId { get; set; }
    public UserEntity BuyerOrTenant { get; set; } = null!;

    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }            // null za prodaju

    public decimal Amount { get; set; }               // najamnina ili cijena
    public int CurrencyId { get; set; }
    public CurrencyEntity Currency { get; set; } = null!;

    public ContractStatus Status { get; set; } = ContractStatus.Draft;
    public string? PdfPath { get; set; }

    public ICollection<RentInstallmentEntity> Installments { get; set; } = new List<RentInstallmentEntity>();
    public ICollection<TransactionEntity> Transactions { get; set; } = new List<TransactionEntity>();
}
