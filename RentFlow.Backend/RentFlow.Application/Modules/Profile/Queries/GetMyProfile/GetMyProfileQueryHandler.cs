using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Profile.Queries.GetMyProfile
{
    public sealed class GetMyProfileQueryHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<GetMyProfileQuery, GetMyProfileQueryDto>
    {
        public async Task<GetMyProfileQueryDto> Handle(GetMyProfileQuery request, CancellationToken ct)
        {
            var userId = currentUser.UserId;

            var user = await ctx.Users.AsNoTracking()
                .Where(u => u.Id == userId)
                .FirstOrDefaultAsync(ct)
                ?? throw new UnauthorizedException("Korisnik nije prijavjen.");

            var propertiesCount = await ctx.Properties
                .CountAsync(p => p.OwnerId == userId, ct);

            var rentedCount = await ctx.Listings
                .CountAsync(l => l.Property.OwnerId == userId && l.Status == ListingStatus.Rented, ct);

            var soldCount = await ctx.Listings
                .CountAsync(l => l.Property.OwnerId == userId && l.Status == ListingStatus.Sold, ct);

            var boughtCount = await ctx.Contracts
                .CountAsync(c => c.BuyerOrTenantId == userId
                              && c.ContractType == ContractType.Sale
                              && c.Status == ContractStatus.Completed, ct);

            var featured = await ctx.Listings.AsNoTracking()
                .Where(l => l.Property.OwnerId == userId && l.Status == ListingStatus.Active)
                .OrderByDescending(l => l.PublishedAtUtc)
                .Select(l => new FeaturedListingDto
                {
                    ListingId = l.Id,
                    Title = l.Title,
                    Description = l.Property.Description,
                    Price = l.Price,
                    CurrencyCode = l.Currency.Code,   
                    MainImageUrl = l.Property.Images
                        .OrderByDescending(i => i.IsMain).ThenBy(i => i.SortOrder)
                        .Select(i => i.Url).FirstOrDefault()
                })
                .FirstOrDefaultAsync(ct);

            var savedRows = await ctx.Favorites.AsNoTracking()
                .Where(f => f.UserId == userId)
                .OrderByDescending(f => f.CreatedAtUtc)
                .Select(f => new
                {
                    f.ListingId,
                    f.Listing.Title,
                    CityName = f.Listing.Property.City.Name,
                    f.Listing.Property.PropertyType,
                    f.Listing.ListingType,
                    f.Listing.Price,
                    CurrencyCode = f.Listing.Currency.Code,
                    MainImageUrl = f.Listing.Property.Images
                        .OrderByDescending(i => i.IsMain).ThenBy(i => i.SortOrder)
                        .Select(i => i.Url).FirstOrDefault()
                })
                .Take(50)
                .ToListAsync(ct);

            return new GetMyProfileQueryDto
            {
                Id = user.Id,
                Firstname = user.Firstname,
                Lastname = user.Lastname,
                Email = user.Email,
                Phone = user.Phone,
                Address = user.Address,
                City = user.City,
                ProfileDescription = user.ProfileDescription,
                ProfileImageUrl = user.ProfileImageUrl,
                CoverImageUrl = user.CoverImageUrl,
                IsVerified = user.IsVerified,
                IsEnabled = user.IsEnabled,
                MemberSinceUtc = user.CreatedAtUtc,
                PropertiesCount = propertiesCount,
                FeaturedListing = featured,
                SavedListings = savedRows.Select(r => new SavedListingDto
                {
                    ListingId = r.ListingId,
                    Title = r.Title,
                    CityName = r.CityName,
                    PropertyType = r.PropertyType.ToString(),
                    ListingType = r.ListingType.ToString(),
                    Price = r.Price,
                    CurrencyCode = r.CurrencyCode,
                    MainImageUrl = r.MainImageUrl
                }).ToList(),
                RentedCount = rentedCount,
                SoldCount = soldCount,
                BoughtCount = boughtCount,
            };
        }
    }
}
