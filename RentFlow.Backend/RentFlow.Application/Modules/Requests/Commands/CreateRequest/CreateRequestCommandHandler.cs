using FluentValidation;
using FluentValidation.Results;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RentFlow.Application.Abstractions;
using RentFlow.Application.Common;
using RentFlow.Application.Modules.Listings.Common;
using RentFlow.Application.Modules.Properties.Common;
using RentFlow.Application.Modules.Requests.Common;
using RentFlow.Domain.Entities;
using RentFlow.Domain.Entities.Deals;
using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Requests.Commands.CreateRequest;

public sealed class CreateRequestCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser, TimeProvider time)
    : IRequestHandler<CreateRequestCommand, CreateRequestCommandDto>
{
    private const int MaxPendingPerUser = 20;
    private static readonly RequestStatus[] ActiveStatuses = [RequestStatus.Pending, RequestStatus.Accepted];

    public async Task<CreateRequestCommandDto> Handle(CreateRequestCommand command, CancellationToken ct)
    {
        var userId = currentUser.UserId
            ?? throw Problems.Invalid("userId", "Korisnik nije prijavljen.");

        var listing = await ctx.Listings.AsNoTracking()
            .Where(l => l.Id == command.ListingId && !l.IsDeleted
                     && ListingStatusRules.PublicStatuses.Contains(l.Status))
            .Select(l => new { l.Id, l.ListingType, l.Status, l.PropertyId, OwnerId = l.Property.OwnerId })
            .FirstOrDefaultAsync(ct)
            ?? throw Problems.NotFound("Oglas nije pronađen.");

        if (listing.OwnerId == userId)
            throw Problems.Invalid("listingId", "Ne možete poslati zahtjev za vlastiti oglas.");

        if (!ListingStatusRules.AcceptsRequests(listing.Status))
            throw Problems.Conflict("Oglas trenutno nije dostupan za nove zahtjeve.");

        var isRent = listing.ListingType == ListingType.Rent;
        var today = DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime);

        var problems = RequestPeriodRules.Validate(listing.ListingType, command.DesiredStartDate, command.DesiredEndDate, today);
        if (problems.Count > 0)
            throw new ValidationException(problems.Select(p => new ValidationFailure(p.Field, p.Message)));

        if (await HasActiveRequestAsync(listing.Id, userId, ct))
            throw Problems.Conflict("Već imate aktivan zahtjev za ovaj oglas.");

        var pending = await ctx.Requests.CountAsync(
            r => r.RequesterId == userId && !r.IsDeleted && r.Status == RequestStatus.Pending, ct);
        if (pending >= MaxPendingPerUser)
            throw Problems.Conflict($"Imate previše zahtjeva na čekanju (najviše {MaxPendingPerUser}).");

        if (isRent)
            await ctx.EnsureNoConflictingContractAsync(
                listing.PropertyId, ContractType.Rent, command.DesiredStartDate, command.DesiredEndDate,
                excludeContractId: 0, ct);

        var request = new RequestEntity
        {
            ListingId = listing.Id,
            RequesterId = userId,
            Message = command.Message.TrimToNull(),
            DesiredStartDate = isRent ? command.DesiredStartDate : null,
            DesiredEndDate = isRent ? command.DesiredEndDate : null,
            Status = RequestStatus.Pending 
        };
        ctx.Requests.Add(request);

        try
        {
            await ctx.SaveChangesCheckedAsync(ct);   
        }
        catch (DbUpdateException)
        {
            if (await HasActiveRequestAsync(listing.Id, userId, ct))
                throw Problems.Conflict("Već imate aktivan zahtjev za ovaj oglas.");
            throw;
        }

        return new CreateRequestCommandDto
        {
            Id = request.Id,
            Status = request.Status,
            ListingType = listing.ListingType,
            CreatedAtUtc = request.CreatedAtUtc
        };
    }

    private Task<bool> HasActiveRequestAsync(int listingId, int userId, CancellationToken ct) =>
        ctx.Requests.AsNoTracking().AnyAsync(
            r => r.ListingId == listingId && r.RequesterId == userId && !r.IsDeleted
              && ActiveStatuses.Contains(r.Status), ct);
}