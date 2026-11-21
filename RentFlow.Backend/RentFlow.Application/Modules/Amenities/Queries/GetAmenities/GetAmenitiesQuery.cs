using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Amenities.Queries.GetAmenities
{
    public sealed class GetAmenitiesQuery : IRequest<List<GetAmenitiesQueryDto>>;

    public sealed class GetAmenitiesQueryDto
    {
        public required int Id { get; init; }
        public required string Name { get; init; }
    }
}
