using RentFlow.Application.Modules.Listings.Common;
using RentFlow.Application.Modules.Properties.Common;
using RentFlow.Domain.Entities.Listing;
using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Commands.CreateListing
{
    public sealed class CreateListingCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser, TimeProvider time)
        : IRequestHandler<CreateListingCommand, CreateListingCommandDto>
    {
        public async Task<CreateListingCommandDto> Handle(CreateListingCommand request, CancellationToken ct)
        {
            var property = await ctx.Properties
                .FirstOrDefaultAsync(p => p.Id == request.PropertyId && p.OwnerId == currentUser.UserId, ct)
                ?? throw Problems.NotFound("Nekretnina nije pronađena.");

            var hasOpenListing = await ctx.Listings
                .AnyAsync(l => l.PropertyId == property.Id && !l.IsDeleted && l.Status != ListingStatus.Closed, ct);

            await ctx.EnsureListingCanBeCreatedAsync(property.Id, exceptListingId: null, ct);

            var listing = new ListingEntity { PropertyId = property.Id };
            ListingMapper.Apply(listing, request);

            if (request.Publish)
            {
                listing.Status = ListingStatus.Active;
                listing.PublishedAtUtc = time.GetUtcNow().UtcDateTime;
            }
            else
            {
                listing.Status = ListingStatus.Draft;
            }

            ctx.Listings.Add(listing);
            await ctx.SaveChangesCheckedAsync(ct);

            return new CreateListingCommandDto { Id = listing.Id, Status = listing.Status };
        }
    }
}
