using RentFlow.Application.Modules.Listings.Common;
using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Commands.UpdateListing
{
    public sealed class UpdateListingCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<UpdateListingCommand>
    {
        public async Task Handle(UpdateListingCommand request, CancellationToken ct)
        {
            var listing = await ctx.GetManageableListingAsync(currentUser, request.Id, ct);

            if (!ListingStatusRules.IsEditable(listing.Status))
                throw Problems.Invalid("status", "Oglas u ovom statusu se ne može mijenjati.");

            if (request.ListingType != listing.ListingType && listing.Status != ListingStatus.Draft)
                throw Problems.Invalid("listingType", "Tip oglasa se može mijenjati samo dok je oglas u pripremi.");

            ListingMapper.Apply(listing, request);
            await ctx.SaveChangesAsync(ct);
        }
    }
}
