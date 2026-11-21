using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Common
{
    /// <summary>Fields shared by CreatePropertyCommand and UpdatePropertyCommand.</summary>
    public abstract record PropertyCommandBase
    {
        public int CityId { get; init; }
        public PropertyType PropertyType { get; init; }
        public string Address { get; init; } = string.Empty;
        public string? Description { get; init; }

        public decimal AreaM2 { get; init; }
        public decimal? PlotAreaM2 { get; init; }
        public int? Rooms { get; init; }
        public int? Bathrooms { get; init; }
        public int? Floor { get; init; }
        public int? TotalFloors { get; init; }
        public int? YearBuilt { get; init; }

        public HeatingType? HeatingType { get; init; }
        public FurnishedStatus? FurnishedStatus { get; init; }
        public PropertyCondition? Condition { get; init; }

        public decimal? Latitude { get; init; }
        public decimal? Longitude { get; init; }

        public List<int> AmenityIds { get; init; } = new();
    }
}
