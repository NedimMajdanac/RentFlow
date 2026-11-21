using RentFlow.Application.Modules.Properties.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Queries.GetPropertyById
{
    public sealed class GetPropertyByIdQueryHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<GetPropertyByIdQuery, GetPropertyByIdQueryDto>
    {
        public async Task<GetPropertyByIdQueryDto> Handle(GetPropertyByIdQuery request, CancellationToken ct)
        {
            var property = await ctx.Properties.AsNoTracking()
                .Where(p => p.Id == request.Id && (p.OwnerId == currentUser.UserId || currentUser.IsAdmin))
                .Select(p => new
                {
                    Id = p.Id,
                    OwnerId = p.OwnerId,
                    CityId = p.CityId,
                    CityName = p.City.Name,
                    PropertyType = p.PropertyType,
                    Address = p.Address,
                    Description = p.Description,
                    AreaM2 = p.AreaM2,
                    PlotAreaM2 = p.PlotAreaM2,
                    Rooms = p.Rooms,
                    Bathrooms = p.Bathrooms,
                    Floor = p.Floor,
                    TotalFloors = p.TotalFloors,
                    YearBuilt = p.YearBuilt,
                    HeatingType = p.HeatingType,
                    FurnishedStatus = p.FurnishedStatus,
                    Condition = p.Condition,
                    Latitude = p.Latitude,
                    Longitude = p.Longitude,
                    CreatedAtUtc = p.CreatedAtUtc
                })
                .FirstOrDefaultAsync(ct)
                ?? throw new NotFoundException("Nekretnina nije pronađena.");

            var images = await ctx.PropertyImages.AsNoTracking()
                .Where(i => i.PropertyId == property.Id && !i.IsDeleted)
                .OrderBy(i => i.SortOrder)
                .Select(i => new PropertyImageDto { Id = i.Id, Url = i.Url, IsMain = i.IsMain, SortOrder = i.SortOrder })
                .ToListAsync(ct);

            var amenities = await ctx.PropertyAmenities.AsNoTracking()
                .Where(pa => pa.PropertyId == property.Id && !pa.IsDeleted)
                .Select(pa => new PropertyAmenityDto { Id = pa.AmenityId, Name = pa.Amenity.Name })
                .OrderBy(a => a.Name)
                .ToListAsync(ct);

            return new GetPropertyByIdQueryDto
            {
                Id = property.Id,
                OwnerId = property.OwnerId,
                CityId = property.CityId,
                CityName = property.CityName,
                PropertyType = property.PropertyType,
                Address = property.Address,
                Description = property.Description,
                AreaM2 = property.AreaM2,
                PlotAreaM2 = property.PlotAreaM2,
                Rooms = property.Rooms,
                Bathrooms = property.Bathrooms,
                Floor = property.Floor,
                TotalFloors = property.TotalFloors,
                YearBuilt = property.YearBuilt,
                HeatingType = property.HeatingType,
                FurnishedStatus = property.FurnishedStatus,
                Condition = property.Condition,
                Latitude = property.Latitude,
                Longitude = property.Longitude,
                CreatedAtUtc = property.CreatedAtUtc,
                Images = images,
                Amenities = amenities
            };
        }
    }
}
