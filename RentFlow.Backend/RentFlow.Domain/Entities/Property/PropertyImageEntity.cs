using RentFlow.Domain.Common;

namespace RentFlow.Domain.Entities.Property;

public class PropertyImageEntity : BaseEntity
{
    public int PropertyId { get; set; }
    public PropertyEntity Property { get; set; } = null!;

    public string Url { get; set; } = string.Empty;
    public bool IsMain { get; set; }
    public int SortOrder { get; set; }
}
