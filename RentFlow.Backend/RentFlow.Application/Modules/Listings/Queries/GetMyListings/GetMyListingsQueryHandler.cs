using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Queries.GetMyListings
{
    public sealed class GetMyListingsQueryHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<GetMyListingsQuery, PageResult<GetMyListingsQueryDto>>
    {
        public async Task<PageResult<GetMyListingsQueryDto>> Handle(GetMyListingsQuery request, CancellationToken ct)
        {
            var query = ctx.Listings.AsNoTracking()
                .Where(l => !l.IsDeleted && l.Property.OwnerId == currentUser.UserId);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.Trim();
                query = query.Where(l => l.Title.Contains(s) || l.Property.Address.Contains(s) || l.Property.City.Name.Contains(s));
            }
            if (request.Status is { } status) query = query.Where(l => l.Status == status);
            if (request.ListingType is { } type) query = query.Where(l => l.ListingType == type);

            var total = await query.CountAsync(ct);

            var items = await query
                .OrderByDescending(l => l.CreatedAtUtc).ThenByDescending(l => l.Id)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(l => new GetMyListingsQueryDto
                {
                    Id = l.Id,
                    PropertyId = l.PropertyId,
                    Title = l.Title,
                    ListingType = l.ListingType,
                    Status = l.Status,
                    Price = l.Price,
                    CurrencyCode = l.Currency.Code,   
                    Deposit = l.Deposit,
                    IsNegotiable = l.IsNegotiable,
                    PublishedAtUtc = l.PublishedAtUtc,
                    CreatedAtUtc = l.CreatedAtUtc,
                    Address = l.Property.Address,
                    CityName = l.Property.City.Name,
                    PropertyType = l.Property.PropertyType,
                    AreaM2 = l.Property.AreaM2,
                    Rooms = l.Property.Rooms,
                    MainImageUrl = l.Property.Images
                        .Where(i => !i.IsDeleted)
                        .OrderByDescending(i => i.IsMain).ThenBy(i => i.SortOrder)
                        .Select(i => i.Url).FirstOrDefault(),
                    PendingRequestsCount = l.Requests.Count(r => !r.IsDeleted && r.Status == RequestStatus.Pending)
                })
                .ToListAsync(ct);

            return new PageResult<GetMyListingsQueryDto>
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
