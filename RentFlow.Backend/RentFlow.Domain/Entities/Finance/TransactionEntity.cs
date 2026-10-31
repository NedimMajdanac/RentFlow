using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Deals;
using RentFlow.Domain.Entities.Identity;
using RentFlow.Domain.Enums;

namespace RentFlow.Domain.Entities.Finance;

public class TransactionEntity : BaseEntity
{
    public int ContractId { get; set; }
    public ContractEntity Contract { get; set; } = null!;

    public int? InstallmentId { get; set; }
    public RentInstallmentEntity? Installment { get; set; }

    public int PayerId { get; set; }
    public UserEntity Payer { get; set; } = null!;

    public int RecordedById { get; set; }
    public UserEntity RecordedBy { get; set; } = null!;

    // amount and currency in which the transaction was recorded (i.e. the amount that was actually paid)
    public decimal OriginalAmount { get; set; }
    public int OriginalCurrencyId { get; set; }
    public CurrencyEntity OriginalCurrency { get; set; } = null!;

    // amount and currency in which the transaction was actually paid
    public decimal PaidAmount { get; set; }
    public int PaidCurrencyId { get; set; }
    public CurrencyEntity PaidCurrency { get; set; } = null!;

    public int? ExchangeRateId { get; set; }          // null if currencies are the same
    public ExchangeRateEntity? ExchangeRate { get; set; }
    public decimal AppliedRate { get; set; } = 1m;    // 1 if currencies are the same, otherwise the rate that was applied to convert from OriginalCurrency to PaidCurrency

    public TransactionStatus Status { get; set; } = TransactionStatus.Pending;
    public DateTime? ExecutedAtUtc { get; set; }

    public ICollection<RefundEntity> Refunds { get; set; } = new List<RefundEntity>();
}
