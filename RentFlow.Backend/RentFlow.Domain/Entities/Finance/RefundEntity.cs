using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Identity;

namespace RentFlow.Domain.Entities.Finance;

public class RefundEntity : BaseEntity
{
    public int TransactionId { get; set; }
    public TransactionEntity Transaction { get; set; } = null!;

    public decimal Amount { get; set; }
    public int CurrencyId { get; set; }
    public CurrencyEntity Currency { get; set; } = null!;

    public int? ExchangeRateId { get; set; }
    public ExchangeRateEntity? ExchangeRate { get; set; }
    public decimal AppliedRate { get; set; } = 1m;

    public string? Reason { get; set; }

    public int CreatedById { get; set; }
    public UserEntity CreatedBy { get; set; } = null!;
}
