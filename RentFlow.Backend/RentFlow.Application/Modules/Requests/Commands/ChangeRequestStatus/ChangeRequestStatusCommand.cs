using MediatR;
using Microsoft.EntityFrameworkCore;
using RentFlow.Application.Abstractions;
using RentFlow.Application.Common;
using RentFlow.Application.Modules.Listings.Common;
using RentFlow.Application.Modules.Requests.Common;
using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Requests.Commands.ChangeRequestStatus;

public sealed record ChangeRequestStatusCommand(int RequestId, RequestAction Action)
    : IRequest<ChangeRequestStatusCommandDto>;

public sealed class ChangeRequestStatusCommandDto
{
    public required RequestStatus Status { get; init; }
    public required ListingStatus ListingStatus { get; init; }
}

public sealed class ChangeRequestStatusCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser, IListingLifecycle lifecycle)
    : IRequestHandler<ChangeRequestStatusCommand, ChangeRequestStatusCommandDto>
{
    public async Task<ChangeRequestStatusCommandDto> Handle(ChangeRequestStatusCommand command, CancellationToken ct)
    {
        var request = await ctx.Requests
            .Include(r => r.Listing).ThenInclude(l => l.Property)
            .FirstOrDefaultAsync(r => r.Id == command.RequestId && !r.IsDeleted, ct);

        var allowed = request is not null && (currentUser.IsAdmin || (command.Action == RequestAction.Cancel
            ? request.RequesterId == currentUser.UserId
            : request.Listing.Property.OwnerId == currentUser.UserId));
        if (!allowed) throw Problems.NotFound("Zahtjev nije pronađen.");

        var listingStatus = command.Action == RequestAction.Accept
            ? await lifecycle.AcceptRequestAsync(request!, ct)
            : await lifecycle.CloseRequestAsync(request!, command.Action, ct);

        await ctx.SaveChangesCheckedAsync(ct);

        return new ChangeRequestStatusCommandDto { Status = request!.Status, ListingStatus = listingStatus };
    }
}