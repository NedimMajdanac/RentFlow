using MediatR;
using Microsoft.EntityFrameworkCore;
using RentFlow.Application.Abstractions;
using RentFlow.Application.Modules.Listings.Common;
using RentFlow.Domain.Entities;
using RentFlow.Domain.Entities.Listing;

namespace RentFlow.Application.Modules.Listings.Commands.RecordListingView;

public sealed record RecordListingViewCommand(int ListingId) : IRequest;

public sealed class RecordListingViewCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser, TimeProvider time)
    : IRequestHandler<RecordListingViewCommand>
{
    private static readonly TimeSpan Window = TimeSpan.FromHours(24);

    public async Task Handle(RecordListingViewCommand request, CancellationToken ct)
    {
        if (currentUser.UserId is not int userId)
            return;

        var listing = await ctx.Listings.AsNoTracking()
            .Where(l => l.Id == request.ListingId && !l.IsDeleted
                     && ListingStatusRules.PublicStatuses.Contains(l.Status))
            .Select(l => new { l.Property.OwnerId })
            .FirstOrDefaultAsync(ct);

        // Nothing to count: unknown or unpublished listing, or the owner looking at their own listing.
        if (listing is null || listing.OwnerId == userId) return;

        // One view per user, listing and 24 hours, so refreshing the page does not inflate the number.
        var since = time.GetUtcNow().UtcDateTime - Window;
        var alreadyCounted = await ctx.ListingViews.AnyAsync(
            v => v.ListingId == request.ListingId && v.ViewerId == userId && v.CreatedAtUtc >= since, ct);
        if (alreadyCounted) return;

        ctx.ListingViews.Add(new ListingViewEntity
        {
            ListingId = request.ListingId,
            ViewerId = userId
        });

        await ctx.SaveChangesAsync(ct);
    }
}