using RentFlow.Application.Modules.Properties.Common;
using RentFlow.Domain.Enums;
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
            int userId = currentUser.UserId
                ?? throw new UnauthorizedAccessException("An authenticated user is required.");

            var rows = ctx.OwnedPropertyRows(userId);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var s = request.Search.Trim();
                rows = rows.Where(r => r.Property.Address.Contains(s)
                                    || r.Property.City.Name.Contains(s)
                                    || (r.Listing != null && r.Listing.Title.Contains(s)));
            }
            if (request.PropertyType is { } type) rows = rows.Where(r => r.Property.PropertyType == type);
            if (request.CityId is { } cityId) rows = rows.Where(r => r.Property.CityId == cityId);
            if (request.Status is { } status) rows = rows.WhereStatus(status);
            if (request.ListingType is { } listingType)
                rows = rows.Where(r => r.Listing != null && r.Listing.ListingType == listingType);

            var ordered = request.Sort switch
            {
                PropertySort.Oldest => rows.OrderBy(r => r.Property.CreatedAtUtc),
                PropertySort.Title => rows.OrderBy(r => r.Listing != null ? r.Listing.Title : r.Property.Address),
                _ => rows.OrderByDescending(r => r.Property.CreatedAtUtc)
            };

            var total = await rows.CountAsync(ct);

            var page = await ordered
                .ThenBy(r => r.Property.Id)   
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(r => new
                {
                    r.Property.Id,
                    ListingTitle = r.Listing != null ? r.Listing.Title : null,
                    r.Property.Address,
                    r.Property.CityId,
                    CityName = r.Property.City.Name,
                    r.Property.PropertyType,
                    r.Property.AreaM2,
                    r.Property.Rooms,
                    r.Property.CreatedAtUtc,
                    LStatus = r.Listing != null ? (ListingStatus?)r.Listing.Status : null,
                    LType = r.Listing != null ? (ListingType?)r.Listing.ListingType : null,
                    LPrice = r.Listing != null ? (decimal?)r.Listing.Price : null,
                    CurrencyCode = r.Listing != null ? r.Listing.Currency.Code : null,
                    MainImageUrl = r.Property.Images
                        .Where(i => !i.IsDeleted)
                        .OrderByDescending(i => i.IsMain).ThenBy(i => i.SortOrder)
                        .Select(i => i.Url).FirstOrDefault(),
                    TenantName = ctx.Contracts
                        .Where(c => c.Request.Listing.PropertyId == r.Property.Id
                                 && c.ContractType == ContractType.Rent
                                 && c.Status == ContractStatus.Active)
                        .OrderByDescending(c => c.StartDate)
                        .Select(c => c.BuyerOrTenant.Firstname + " " + c.BuyerOrTenant.Lastname)
                        .FirstOrDefault()
                })
                .ToListAsync(ct);

            var items = page.Select(x => new GetMyPropertiesQueryDto
            {
                Id = x.Id,
                Title = x.ListingTitle ?? x.Address,
                Address = x.Address,
                CityId = x.CityId,
                CityName = x.CityName,
                PropertyType = x.PropertyType,
                AreaM2 = x.AreaM2,
                Rooms = x.Rooms,
                MainImageUrl = x.MainImageUrl,
                CreatedAtUtc = x.CreatedAtUtc,
                Status = PropertyStatusMapper.From(x.LStatus),
                ListingType = x.LType,
                Price = x.LPrice,
                CurrencyCode = x.CurrencyCode,
                TenantName = x.TenantName
            }).ToList();

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