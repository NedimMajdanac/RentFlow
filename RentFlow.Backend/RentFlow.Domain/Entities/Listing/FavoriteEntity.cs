using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Identity;

namespace RentFlow.Domain.Entities.Listing;

public class FavoriteEntity : BaseEntity
{
    public int UserId { get; set; }
    public UserEntity User { get; set; } = null!;

    public int ListingId { get; set; }
    public ListingEntity Listing { get; set; } = null!;
}
