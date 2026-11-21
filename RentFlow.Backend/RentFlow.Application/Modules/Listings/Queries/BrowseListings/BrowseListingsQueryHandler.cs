using RentFlow.Application.Modules.Listings.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Queries.BrowseListings
{
    public sealed class BrowseListingsQueryHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<BrowseListingsQuery, PageResult<BrowseListingsQueryDto>>
    {
        public async Task<PageResult<BrowseListingsQueryDto>> Handle(BrowseListingsQuery request, CancellationToken ct)
        {
            var userId = currentUser.UserId;

            var query = ctx.Listings.AsNoTracking()
                .Where(l => !l.IsDeleted
                         && ListingStatusRules.PublicStatuses.Contains(l.Status)
                         && l.Property.OwnerId != userId);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.Trim();
                query = query.Where(l => l.Title.Contains(s) || l.Property.Address.Contains(s) || l.Property.City.Name.Contains(s));
            }
            if (request.ListingType is { } listingType) query = query.Where(l => l.ListingType == listingType);
            if (request.PropertyType is { } propertyType) query = query.Where(l => l.Property.PropertyType == propertyType);
            if (request.CityId is { } cityId) query = query.Where(l => l.Property.CityId == cityId);

            if (request.CurrencyId is { } currencyId) query = query.Where(l => l.CurrencyId == currencyId);
            if (request.MinPrice is { } minPrice) query = query.Where(l => l.Price >= minPrice);
            if (request.MaxPrice is { } maxPrice) query = query.Where(l => l.Price <= maxPrice);

            if (request.MinRooms is { } minRooms) query = query.Where(l => l.Property.Rooms >= minRooms);
            if (request.MinAreaM2 is { } minArea) query = query.Where(l => l.Property.AreaM2 >= minArea);
            if (request.MaxAreaM2 is { } maxArea) query = query.Where(l => l.Property.AreaM2 <= maxArea);

            foreach (var amenityId in request.AmenityIds.Distinct())
            {
                var id = amenityId;   
                query = query.Where(l => l.Property.Amenities.Any(a => a.AmenityId == id && !a.IsDeleted));
            }

            var ordered = request.Sort switch
            {
                ListingSort.PriceAsc => query.OrderBy(l => l.Price),
                ListingSort.PriceDesc => query.OrderByDescending(l => l.Price),
                _ => query.OrderByDescending(l => l.PublishedAtUtc)
            };

            var total = await query.CountAsync(ct);

            var items = await ordered
                .ThenByDescending(l => l.Id)  
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(l => new BrowseListingsQueryDto
                {
                    Id = l.Id,
                    Title = l.Title,
                    ListingType = l.ListingType,
                    Status = l.Status,
                    Price = l.Price,
                    CurrencyCode = l.Currency.Code,   
                    IsNegotiable = l.IsNegotiable,
                    PublishedAtUtc = l.PublishedAtUtc,
                    PropertyType = l.Property.PropertyType,
                    Address = l.Property.Address,
                    CityName = l.Property.City.Name,
                    AreaM2 = l.Property.AreaM2,
                    Rooms = l.Property.Rooms,
                    MainImageUrl = l.Property.Images
                        .Where(i => !i.IsDeleted)
                        .OrderByDescending(i => i.IsMain).ThenBy(i => i.SortOrder)
                        .Select(i => i.Url).FirstOrDefault(),
                    IsFavorite = ctx.Favorites.Any(f => f.ListingId == l.Id && f.UserId == userId && !f.IsDeleted)
                })
                .ToListAsync(ct);

            return new PageResult<BrowseListingsQueryDto>
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
