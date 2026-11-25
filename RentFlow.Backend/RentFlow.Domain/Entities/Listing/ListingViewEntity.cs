using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Identity;
using RentFlow.Domain.Entities.Listing;

namespace RentFlow.Domain.Entities.Listing;

/// <summary>One counted view of a published listing by a logged-in user (CreatedAtUtc is the time of the view).</summary>
public class ListingViewEntity : BaseEntity
{
    public int ListingId { get; set; }
    public ListingEntity Listing { get; set; } = null!;

    public int ViewerId { get; set; }
    public UserEntity Viewer { get; set; } = null!;
}