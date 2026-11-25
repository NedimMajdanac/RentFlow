using RentFlow.Application.Modules.Listings.Common;
using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Commands.DeleteListing
{
    public sealed class DeleteListingCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<DeleteListingCommand>
    {
        public async Task Handle(DeleteListingCommand request, CancellationToken ct)
        {
            var listing = await ctx.GetManageableListingAsync(currentUser, request.Id, ct);

            if (listing.Status is not (ListingStatus.Draft or ListingStatus.Closed))
                throw Problems.Invalid("status", "Brisati se mogu samo oglasi u pripremi ili zatvoreni oglasi.");

            if (await ctx.Requests.AnyAsync(r => r.ListingId == listing.Id && !r.IsDeleted, ct))
                throw Problems.Invalid("listing", "Oglas ima zahtjeve i ne može se obrisati. Zatvorite ga.");

            var favorites = await ctx.Favorites.Where(f => f.ListingId == listing.Id && !f.IsDeleted).ToListAsync(ct);
            foreach (var f in favorites) f.IsDeleted = true;

            listing.IsDeleted = true;
            await ctx.SaveChangesAsync(ct);
        }
    }
}
