using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Identity;
using RentFlow.Domain.Entities.Listing;
using RentFlow.Domain.Enums;

namespace RentFlow.Domain.Entities.Deals;

public class RequestEntity : BaseEntity
{
    public int ListingId { get; set; }
    public ListingEntity Listing { get; set; } = null!;

    public int RequesterId { get; set; }
    public UserEntity Requester { get; set; } = null!;

    public string? Message { get; set; }
    public DateOnly? DesiredStartDate { get; set; }
    public DateOnly? DesiredEndDate { get; set; }     // samo za najam

    public RequestStatus Status { get; set; } = RequestStatus.Pending;
    public DateTime? RespondedAtUtc { get; set; }
}
