using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Identity;
using RentFlow.Domain.Entities.Listing;
using RentFlow.Domain.Enums;

namespace RentFlow.Domain.Entities.Property;

public class PropertyEntity : BaseEntity
{
    public int OwnerId { get; set; }
    public UserEntity Owner { get; set; } = null!;

    public int CityId { get; set; }
    public CityEntity City { get; set; } = null!;

    public PropertyType PropertyType { get; set; }
    public string Address { get; set; } = string.Empty;
    public string? Description { get; set; }

    public decimal AreaM2 { get; set; }
    public decimal? PlotAreaM2 { get; set; }
    public int? Rooms { get; set; }
    public int? Bathrooms { get; set; }
    public int? Floor { get; set; }          
    public int? TotalFloors { get; set; }
    public int? YearBuilt { get; set; }

    public HeatingType? HeatingType { get; set; }
    public FurnishedStatus? FurnishedStatus { get; set; }
    public PropertyCondition? Condition { get; set; }

    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }

    public ICollection<PropertyImageEntity> Images { get; set; } = new List<PropertyImageEntity>();
    public ICollection<PropertyAmenityEntity> Amenities { get; set; } = new List<PropertyAmenityEntity>();
    public ICollection<ListingEntity> Listings { get; set; } = new List<ListingEntity>();
}
