using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Queries.GetMyProperties
{
    public sealed class GetMyPropertiesQuery : IRequest<PageResult<GetMyPropertiesQueryDto>>
    {
        public string? Search { get; init; }          
        public PropertyType? PropertyType { get; init; }
        public int? CityId { get; init; }
        public int PageNumber { get; init; } = 1;
        public int PageSize { get; init; } = 12;
    }

    public sealed class GetMyPropertiesQueryDto
    {
        public required int Id { get; init; }
        public required string Address { get; init; }
        public required int CityId { get; init; }
        public required string CityName { get; init; }
        public required PropertyType PropertyType { get; init; }
        public required decimal AreaM2 { get; init; }
        public required int? Rooms { get; init; }
        public required string? MainImageUrl { get; init; }
        public required DateTime CreatedAtUtc { get; init; }
    }
}
