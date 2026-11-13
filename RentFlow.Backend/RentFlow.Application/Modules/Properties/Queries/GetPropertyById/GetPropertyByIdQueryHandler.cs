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
            // Za sada samo vlasnik ili admin. Javni prikaz ide kasnije kroz oglase (listings).
            var dto = await ctx.Properties.AsNoTracking()
                .Where(p => p.Id == request.Id && (p.OwnerId == currentUser.UserId || currentUser.IsAdmin))
                .Select(p => new GetPropertyByIdQueryDto
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
                    CreatedAtUtc = p.CreatedAtUtc,
                    Images = p.Images
                        .Where(i => !i.IsDeleted)
                        .OrderBy(i => i.SortOrder)
                        .Select(i => new PropertyImageDto { Id = i.Id, Url = i.Url, IsMain = i.IsMain, SortOrder = i.SortOrder })
                        .ToList(),
                    Amenities = p.Amenities
                        .Where(pa => !pa.IsDeleted)
                        .Select(pa => new PropertyAmenityDto { Id = pa.AmenityId, Name = pa.Amenity.Name })
                        .OrderBy(a => a.Name)
                        .ToList()
                })
                .FirstOrDefaultAsync(ct)
                // TODO(starter): zamijeni exceptionom koji middleware pretvara u 404
                ?? throw new KeyNotFoundException("Nekretnina nije pronađena.");

            return dto;
        }
    }
}
