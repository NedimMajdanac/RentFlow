using RentFlow.Domain.Common;

namespace RentFlow.Domain.Common;

public class CityEntity : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? PostalCode { get; set; }
    public string? Region { get; set; }
}
