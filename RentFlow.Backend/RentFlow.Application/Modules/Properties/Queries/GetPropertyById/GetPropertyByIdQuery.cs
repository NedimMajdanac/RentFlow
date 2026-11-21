using RentFlow.Application.Modules.Properties.Common;
using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Queries.GetPropertyById
{
    public sealed record GetPropertyByIdQuery(int Id) : IRequest<GetPropertyByIdQueryDto>;

    public sealed class GetPropertyByIdQueryDto
    {
        public required int Id { get; init; }
        public required int OwnerId { get; init; }
        public required int CityId { get; init; }
        public required string CityName { get; init; }
        public required PropertyType PropertyType { get; init; }
        public required string Address { get; init; }
        public required string? Description { get; init; }
        public required decimal AreaM2 { get; init; }
        public required decimal? PlotAreaM2 { get; init; }
        public required int? Rooms { get; init; }
        public required int? Bathrooms { get; init; }
        public required int? Floor { get; init; }
        public required int? TotalFloors { get; init; }
        public required int? YearBuilt { get; init; }
        public required HeatingType? HeatingType { get; init; }
        public required FurnishedStatus? FurnishedStatus { get; init; }
        public required PropertyCondition? Condition { get; init; }
        public required decimal? Latitude { get; init; }
        public required decimal? Longitude { get; init; }
        public required DateTime CreatedAtUtc { get; init; }
        public required List<PropertyImageDto> Images { get; init; }
        public required List<PropertyAmenityDto> Amenities { get; init; }
    }
}
