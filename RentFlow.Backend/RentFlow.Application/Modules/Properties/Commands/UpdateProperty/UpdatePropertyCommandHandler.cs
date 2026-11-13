using RentFlow.Application.Modules.Properties.Common;
using RentFlow.Domain.Entities.Property;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.UpdateProperty
{
    public sealed class UpdatePropertyCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<UpdatePropertyCommand>
    {
        public async Task Handle(UpdatePropertyCommand request, CancellationToken ct)
        {
            var property = await ctx.GetEditablePropertyAsync(currentUser, request.Id, ct);

            PropertyMapper.Apply(property, request);
            await SyncAmenitiesAsync(property.Id, request.AmenityIds, ct);

            await ctx.SaveChangesAsync(ct);
        }

        /// <summary>Makes the property's amenities equal to the wanted list (removed ones are soft-deleted).</summary>
        private async Task SyncAmenitiesAsync(int propertyId, List<int> amenityIds, CancellationToken ct)
        {
            var wanted = amenityIds.ToHashSet();

            var existing = await ctx.PropertyAmenities
                .Where(pa => pa.PropertyId == propertyId && !pa.IsDeleted)
                .ToListAsync(ct);

            foreach (var link in existing.Where(pa => !wanted.Contains(pa.AmenityId)))
                link.IsDeleted = true;

            var have = existing.Select(pa => pa.AmenityId).ToHashSet();
            foreach (var amenityId in wanted.Where(id => !have.Contains(id)))
                ctx.PropertyAmenities.Add(new PropertyAmenityEntity { PropertyId = propertyId, AmenityId = amenityId });
        }
    }
}
