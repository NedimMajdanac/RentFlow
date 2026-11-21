using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Currencies.Queries.GetCurrencies
{
    public sealed class GetCurrenciesQuery : IRequest<List<GetCurrenciesQueryDto>>;

    public sealed class GetCurrenciesQueryDto
    {
        public required int Id { get; init; }
        public required string Code { get; init; }  
        public required string? Name { get; init; }
    }

    public sealed class GetCurrenciesQueryHandler(IAppDbContext ctx)
        : IRequestHandler<GetCurrenciesQuery, List<GetCurrenciesQueryDto>>
    {
        public Task<List<GetCurrenciesQueryDto>> Handle(GetCurrenciesQuery request, CancellationToken ct)
            => ctx.Currencies.AsNoTracking()
                .OrderBy(c => c.Code)
                .Select(c => new GetCurrenciesQueryDto { Id = c.Id, Code = c.Code, Name = c.Name })
                .ToListAsync(ct);
    }
}
