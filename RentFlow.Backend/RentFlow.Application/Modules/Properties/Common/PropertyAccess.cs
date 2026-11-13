using RentFlow.Domain.Entities.Property;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Common
{
    public static class PropertyAccess
    {
        /// <summary>
        /// Loads a tracked property the current user may change (owner or admin).
        /// Other users get "not found", so the existence of foreign properties is not revealed.
        /// </summary>
        public static async Task<PropertyEntity> GetEditablePropertyAsync(
            this IAppDbContext ctx, IAppCurrentUser user, int propertyId, CancellationToken ct)
        {
            var property = await ctx.Properties.FirstOrDefaultAsync(p => p.Id == propertyId, ct);

            if (property is null || (property.OwnerId != user.UserId && !user.IsAdmin))
                throw new NotFoundException("Nekretnina nije pronađena.");

            return property;
        }
    }
}
