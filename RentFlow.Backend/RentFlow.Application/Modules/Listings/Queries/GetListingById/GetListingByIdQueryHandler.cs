using RentFlow.Application.Modules.Listings.Common;
using RentFlow.Application.Modules.Properties.Common;
using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Queries.GetListingById
{
    public sealed class GetListingByIdQueryHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<GetListingByIdQuery, GetListingByIdQueryDto>
    {
        public async Task<GetListingByIdQueryDto> Handle(GetListingByIdQuery request, CancellationToken ct)
        {
            var userId = currentUser.UserId;
            var isAdmin = currentUser.IsAdmin;

            var dto = await ctx.Listings.AsNoTracking()
                .Where(l => l.Id == request.Id && !l.IsDeleted
                         && (l.Property.OwnerId == userId || isAdmin || ListingStatusRules.PublicStatuses.Contains(l.Status)))
                .Select(l => new GetListingByIdQueryDto
                {
                    Id = l.Id,
                    ListingType = l.ListingType,
                    Title = l.Title,
                    Price = l.Price,
                    CurrencyId = l.CurrencyId,
                    CurrencyCode = l.Currency.Code,   
                    Deposit = l.Deposit,
                    IsNegotiable = l.IsNegotiable,
                    Status = l.Status,
                    PublishedAtUtc = l.PublishedAtUtc,
                    CreatedAtUtc = l.CreatedAtUtc,
                    IsOwner = l.Property.OwnerId == userId,
                    IsFavorite = ctx.Favorites.Any(f => f.ListingId == l.Id && f.UserId == userId && !f.IsDeleted),
                    MyActiveRequestId = ctx.Requests
                        .Where(r => r.ListingId == l.Id && r.RequesterId == userId && !r.IsDeleted
                                 && (r.Status == RequestStatus.Pending || r.Status == RequestStatus.Accepted))
                        .Select(r => (int?)r.Id)
                        .FirstOrDefault(),
                    Property = new ListingPropertyDto
                    {
                        Id = l.Property.Id,
                        PropertyType = l.Property.PropertyType,
                        Address = l.Property.Address,
                        CityId = l.Property.CityId,
                        CityName = l.Property.City.Name,
                        Description = l.Property.Description,
                        AreaM2 = l.Property.AreaM2,
                        PlotAreaM2 = l.Property.PlotAreaM2,
                        Rooms = l.Property.Rooms,
                        Bathrooms = l.Property.Bathrooms,
                        Floor = l.Property.Floor,
                        TotalFloors = l.Property.TotalFloors,
                        YearBuilt = l.Property.YearBuilt,
                        HeatingType = l.Property.HeatingType,
                        FurnishedStatus = l.Property.FurnishedStatus,
                        Condition = l.Property.Condition,
                        Latitude = l.Property.Latitude,
                        Longitude = l.Property.Longitude,
                        Images = l.Property.Images
                            .Where(i => !i.IsDeleted)
                            .OrderBy(i => i.SortOrder)
                            .Select(i => new PropertyImageDto { Id = i.Id, Url = i.Url, IsMain = i.IsMain, SortOrder = i.SortOrder })
                            .ToList(),
                        Amenities = l.Property.Amenities
                            .Where(pa => !pa.IsDeleted)
                            .Select(pa => new PropertyAmenityDto { Id = pa.AmenityId, Name = pa.Amenity.Name })
                            .OrderBy(a => a.Name)
                            .ToList()
                    },
                    Owner = new ListingOwnerDto
                    {
                        Id = l.Property.OwnerId,
                        Name = l.Property.Owner.Firstname + " " + l.Property.Owner.Lastname,
                        IsVerified = l.Property.Owner.IsVerified,
                        ProfileImageUrl = l.Property.Owner.ProfileImageUrl,
                        MemberSinceUtc = l.Property.Owner.CreatedAtUtc
                    }
                })
                .FirstOrDefaultAsync(ct)
                ?? throw Problems.NotFound("Oglas nije pronađen.");

            dto.OtherListings = await ctx.Listings.AsNoTracking()
                .Where(o => o.Id != dto.Id
                         && !o.IsDeleted
                         && o.Property.OwnerId == dto.Owner.Id
                         && ListingStatusRules.PublicStatuses.Contains(o.Status))
                .OrderByDescending(o => o.PublishedAtUtc).ThenByDescending(o => o.Id)
                .Take(10)
                .Select(o => new OwnerListingDto
                {
                    Id = o.Id,
                    Title = o.Title,
                    ListingType = o.ListingType,
                    Price = o.Price,
                    CurrencyCode = o.Currency.Code,   
                    PropertyType = o.Property.PropertyType,
                    CityName = o.Property.City.Name,
                    MainImageUrl = o.Property.Images
                        .Where(i => !i.IsDeleted)
                        .OrderByDescending(i => i.IsMain).ThenBy(i => i.SortOrder)
                        .Select(i => i.Url).FirstOrDefault()
                })
                .ToListAsync(ct);

            return dto;
        }
    }
}
