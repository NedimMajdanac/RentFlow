using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Queries.GetMyProperties
{
    public sealed class GetMyPropertiesQueryHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<GetMyPropertiesQuery, PageResult<GetMyPropertiesQueryDto>>
    {
        public async Task<PageResult<GetMyPropertiesQueryDto>> Handle(GetMyPropertiesQuery request, CancellationToken ct)
        {
            var query = ctx.Properties.AsNoTracking().Where(p => p.OwnerId == currentUser.UserId);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.Trim();
                query = query.Where(p => p.Address.Contains(s) || p.City.Name.Contains(s));
            }
            if (request.PropertyType is { } type) query = query.Where(p => p.PropertyType == type);
            if (request.CityId is { } cityId) query = query.Where(p => p.CityId == cityId);

            var total = await query.CountAsync(ct);

            var items = await query
                .OrderByDescending(p => p.CreatedAtUtc)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(p => new GetMyPropertiesQueryDto
                {
                    Id = p.Id,
                    Address = p.Address,
                    CityId = p.CityId,
                    CityName = p.City.Name,
                    PropertyType = p.PropertyType,
                    AreaM2 = p.AreaM2,
                    Rooms = p.Rooms,
                    CreatedAtUtc = p.CreatedAtUtc,
                    MainImageUrl = p.Images
                        .Where(i => !i.IsDeleted)
                        .OrderByDescending(i => i.IsMain).ThenBy(i => i.SortOrder)
                        .Select(i => i.Url).FirstOrDefault()
                })
                .ToListAsync(ct);

            return new PageResult<GetMyPropertiesQueryDto>
            {
                Items = items,
                PageSize = request.PageSize,
                CurrentPage = request.PageNumber,
                IncludedTotal = true,
                TotalItems = total,
                TotalPages = (int)Math.Ceiling(total / (double)request.PageSize)
            };
        }
    }
}
