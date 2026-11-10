using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Cities.Queries.GetCities
{
    public sealed class GetCitiesQueryHandler(IAppDbContext ctx)
        : IRequestHandler<GetCitiesQuery, List<GetCitiesQueryDto>>
    {
        public Task<List<GetCitiesQueryDto>> Handle(GetCitiesQuery request, CancellationToken ct)
            => ctx.Cities.AsNoTracking()
                .OrderBy(c => c.Name)
                .Select(c => new GetCitiesQueryDto { Id = c.Id, Name = c.Name, Region = c.Region })
                .ToListAsync(ct);
    }
}
