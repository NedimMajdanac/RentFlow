using RentFlow.Domain.Entities.Listing;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Common
{
    public static class ListingAccess
    {
        /// <summary>
        /// loads the listing and checks if the current user is allowed to manage it (owner or admin).
        /// other users will get a NotFoundException to avoid leaking information about the listing's existence.
        /// </summary>
        public static async Task<ListingEntity> GetManageableListingAsync(
            this IAppDbContext ctx, IAppCurrentUser user, int id, CancellationToken ct)
        {
            var listing = await ctx.Listings
                .Include(l => l.Property)
                .FirstOrDefaultAsync(l => l.Id == id && !l.IsDeleted, ct);

            if (listing is null || (listing.Property.OwnerId != user.UserId && !user.IsAdmin))
                throw Problems.NotFound("Oglas nije pronađen.");

            return listing;
        }
    }
}
