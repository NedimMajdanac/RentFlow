using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Amenities.Queries.GetAmenities
{
    public sealed class GetAmenitiesQueryHandler(IAppDbContext ctx)
        : IRequestHandler<GetAmenitiesQuery, List<GetAmenitiesQueryDto>>
    {
        public Task<List<GetAmenitiesQueryDto>> Handle(GetAmenitiesQuery request, CancellationToken ct)
            => ctx.Amenities.AsNoTracking()
                .OrderBy(a => a.Name)
                .Select(a => new GetAmenitiesQueryDto { Id = a.Id, Name = a.Name })
                .ToListAsync(ct);
    }
}
