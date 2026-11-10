using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Cities.Queries.GetCities
{
    public sealed class GetCitiesQuery : IRequest<List<GetCitiesQueryDto>> { }

    public sealed class GetCitiesQueryDto
    {
        public required int Id { get; init; }
        public required string Name { get; init; }
        public required string? Region { get; init; }
    }
}
