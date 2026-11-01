using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Deals;
using RentFlow.Domain.Entities.Finance;
using RentFlow.Domain.Entities.Property;
using RentFlow.Domain.Enums;

namespace RentFlow.Domain.Entities.Listing;

public class ListingEntity : BaseEntity
{
    public int PropertyId { get; set; }
    public PropertyEntity Property { get; set; } = null!;

    public ListingType ListingType { get; set; }
    public string Title { get; set; } = string.Empty;

    public decimal Price { get; set; }
    public int CurrencyId { get; set; }
    public CurrencyEntity Currency { get; set; } = null!;

    public decimal? Deposit { get; set; }
    public bool IsNegotiable { get; set; }
    public ListingStatus Status { get; set; } = ListingStatus.Draft;
    public DateTime? PublishedAtUtc { get; set; }

    public ICollection<RequestEntity> Requests { get; set; } = new List<RequestEntity>();
}
