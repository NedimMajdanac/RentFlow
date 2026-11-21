using RentFlow.Application.Modules.Listings.Common;
using RentFlow.Domain.Entities.Listing;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Commands.Favorites
{
    public sealed record AddFavoriteCommand(int ListingId) : IRequest;
    public sealed record RemoveFavoriteCommand(int ListingId) : IRequest;

    public sealed class AddFavoriteCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<AddFavoriteCommand>
    {
        public async Task Handle(AddFavoriteCommand request, CancellationToken ct)
        {
            if (currentUser.UserId is not int userId)
                throw new InvalidOperationException("The current user is not authenticated.");

            var listing = await ctx.Listings.AsNoTracking()
                .Where(l => l.Id == request.ListingId && !l.IsDeleted
                         && ListingStatusRules.PublicStatuses.Contains(l.Status))
                .Select(l => new { l.Property.OwnerId })
                .FirstOrDefaultAsync(ct)
                ?? throw Problems.NotFound("Oglas nije pronađen.");

            if (listing.OwnerId == userId)
                throw Problems.Invalid("listingId", "Ne možete sačuvati vlastiti oglas.");

            var exists = await ctx.Favorites.AnyAsync(
                f => f.UserId == userId
                  && f.ListingId == request.ListingId
                  && !f.IsDeleted,
                ct);

            if (exists) return;

            ctx.Favorites.Add(new FavoriteEntity
            {
                UserId = userId,
                ListingId = request.ListingId
            });

            await ctx.SaveChangesAsync(ct);
        }
    }

    public sealed class RemoveFavoriteCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<RemoveFavoriteCommand>
    {
        public async Task Handle(RemoveFavoriteCommand request, CancellationToken ct)
        {
            if (currentUser.UserId is not int userId)
                throw new InvalidOperationException("The current user is not authenticated.");

            var favorite = await ctx.Favorites.FirstOrDefaultAsync(
                f => f.UserId == userId
                  && f.ListingId == request.ListingId
                  && !f.IsDeleted,
                ct);

            if (favorite is null) return;

            favorite.IsDeleted = true;
            await ctx.SaveChangesAsync(ct);
        }
    }
}
