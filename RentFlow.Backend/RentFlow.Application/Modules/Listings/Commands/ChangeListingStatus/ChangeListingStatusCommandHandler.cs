using RentFlow.Application.Modules.Listings.Common;
using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Commands.ChangeListingStatus
{
    public sealed class ChangeListingStatusCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser, TimeProvider time)
        : IRequestHandler<ChangeListingStatusCommand, ChangeListingStatusCommandDto>
    {
        public async Task<ChangeListingStatusCommandDto> Handle(ChangeListingStatusCommand request, CancellationToken ct)
        {
            var listing = await ctx.GetManageableListingAsync(currentUser, request.Id, ct);
            var now = time.GetUtcNow().UtcDateTime;

            var next = ListingStatusRules.Apply(listing.Status, request.Action)
                ?? throw Problems.Invalid("status", "Ta radnja nije dozvoljena za oglas u trenutnom statusu.");

            if (request.Action is ListingAction.Publish or ListingAction.Reopen)
            {
                var another = await ctx.Listings.AnyAsync(l =>
                    l.PropertyId == listing.PropertyId &&
                    l.Id != listing.Id &&
                    !l.IsDeleted &&
                    l.Status != ListingStatus.Closed, ct);

                if (another)
                    throw Problems.Invalid("status", "Nekretnina već ima drugi oglas koji nije zatvoren.");
            }

            if (request.Action == ListingAction.Publish) listing.PublishedAtUtc = now;

            if (request.Action is ListingAction.Unpublish or ListingAction.Close)
            {
                var pending = await ctx.Requests
                    .Where(r => r.ListingId == listing.Id && !r.IsDeleted && r.Status == RequestStatus.Pending)
                    .ToListAsync(ct);

                foreach (var r in pending)
                {
                    r.Status = RequestStatus.Rejected;
                    r.RespondedAtUtc = now;
                }
            }

            listing.Status = next;
            await ctx.SaveChangesAsync(ct);

            return new ChangeListingStatusCommandDto { Status = listing.Status };
        }
    }
}
