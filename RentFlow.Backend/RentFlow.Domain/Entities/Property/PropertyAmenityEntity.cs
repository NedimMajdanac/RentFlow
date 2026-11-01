using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Property;

namespace RentFlow.Domain.Entities.Property;

public class PropertyAmenityEntity : BaseEntity
{
    public int PropertyId { get; set; }
    public PropertyEntity Property { get; set; } = null!;

    public int AmenityId { get; set; }
    public AmenityEntity Amenity { get; set; } = null!;
}
