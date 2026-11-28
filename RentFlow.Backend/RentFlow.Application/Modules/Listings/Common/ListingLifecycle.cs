using Microsoft.EntityFrameworkCore;
using RentFlow.Application.Abstractions;
using RentFlow.Application.Common;
using RentFlow.Application.Modules.Contracts.Common;
using RentFlow.Application.Modules.Properties.Common;
using RentFlow.Application.Modules.Requests.Common;
using RentFlow.Domain.Entities;
using RentFlow.Domain.Entities.Deals;
using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Listings.Common;

/// <summary>
/// Keeps requests, contracts and listings consistent. Callers load the entities (tracked, with their
/// navigation properties), call one method, and save once, so everything changes in one transaction.
/// </summary>
public interface IListingLifecycle
{
    /// <summary>Pending request -> Accepted; the listing becomes Reserved and other pending requests are rejected.</summary>
    Task<ListingStatus> AcceptRequestAsync(RequestEntity request, CancellationToken ct);

    /// <summary>Reject (owner) or cancel (requester). Releases the reservation if the request was accepted.</summary>
    Task<ListingStatus> CloseRequestAsync(RequestEntity request, RequestAction action, CancellationToken ct);

    /// <summary>Activate, complete or terminate a contract and move the listing accordingly.</summary>
    Task<ListingStatus> ApplyContractAsync(ContractEntity contract, ContractAction action, CancellationToken ct);
}

public sealed class ListingLifecycle(IAppDbContext ctx, TimeProvider time) : IListingLifecycle
{
    public async Task<ListingStatus> AcceptRequestAsync(RequestEntity request, CancellationToken ct)
    {
        var listing = request.Listing;

        var accepted = RequestStatusRules.Apply(request.Status, RequestAction.Accept)
            ?? throw Problems.Invalid("status", "Prihvatiti se može samo zahtjev na čekanju.");
        var reserved = ListingStatusRules.Next(listing.Status, ListingEvent.RequestAccepted)
            ?? throw Problems.Invalid("status", "Zahtjev se može prihvatiti samo za aktivan oglas.");

        await ctx.EnsureNoConflictingContractAsync(
            listing.PropertyId, ContractTypeFor(listing.ListingType),
            request.DesiredStartDate, request.DesiredEndDate, excludeContractId: 0, ct);

        var now = time.GetUtcNow().UtcDateTime;
        request.Status = accepted;
        request.RespondedAtUtc = now;

        var others = await ctx.Requests
            .Where(r => r.ListingId == listing.Id && r.Id != request.Id && !r.IsDeleted && r.Status == RequestStatus.Pending)
            .ToListAsync(ct);
        foreach (var other in others)
        {
            other.Status = RequestStatus.Rejected;
            other.RespondedAtUtc = now;
        }

        listing.Status = reserved;
        return listing.Status;
    }

    public async Task<ListingStatus> CloseRequestAsync(RequestEntity request, RequestAction action, CancellationToken ct)
    {
        var listing = request.Listing;

        var next = RequestStatusRules.Apply(request.Status, action)
            ?? throw Problems.Invalid("status", "Zahtjev u trenutnom statusu se ne može promijeniti.");

        if (request.Status == RequestStatus.Accepted)
        {
            if (listing.Status != ListingStatus.Reserved)
                throw Problems.Invalid("status", "Proces je u toku ili završen i zahtjev se više ne može promijeniti.");

            var contract = await ctx.Contracts.FirstOrDefaultAsync(
                c => c.RequestId == request.Id && !c.IsDeleted
                  && (c.Status == ContractStatus.Draft || c.Status == ContractStatus.Active), ct);

            if (contract?.Status == ContractStatus.Active)
                throw Problems.Invalid("status", "Ugovor je aktivan. Prvo raskinite ugovor.");
            if (contract is not null) contract.Status = ContractStatus.Terminated; 

            listing.Status = ListingStatusRules.Next(listing.Status, ListingEvent.ReservationReleased) ?? Inconsistent();
        }

        request.Status = next;
        if (action == RequestAction.Reject) request.RespondedAtUtc = time.GetUtcNow().UtcDateTime;
        return listing.Status;
    }

    public async Task<ListingStatus> ApplyContractAsync(ContractEntity contract, ContractAction action, CancellationToken ct)
    {
        var request = contract.Request;
        var listing = request.Listing;
        var type = contract.ContractType;
        var today = DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime);

        var next = ContractStatusRules.Apply(contract.Status, action)
            ?? throw Problems.Invalid("status", "Ta radnja nije dozvoljena za ugovor u trenutnom statusu.");

        if (type != ContractTypeFor(listing.ListingType))
            throw Problems.Invalid("contractType", "Tip ugovora ne odgovara tipu oglasa.");

        switch (action)
        {
            case ContractAction.Activate:
                if (request.Status != RequestStatus.Accepted)
                    throw Problems.Invalid("status", "Ugovor se može aktivirati samo uz prihvaćen zahtjev.");

                await ctx.EnsureNoConflictingContractAsync(
                    listing.PropertyId, type, contract.StartDate, contract.EndDate, contract.Id, ct);

                if (type == ContractType.Rent)
                    listing.Status = ListingStatusRules.Next(listing.Status, ListingEvent.RentalStarted) ?? Inconsistent();
                else if (listing.Status != ListingStatus.Reserved)
                    Inconsistent(); // a sale stays reserved until it is completed
                break;

            case ContractAction.Complete:
                if (type == ContractType.Rent)
                {
                    if (contract.EndDate is null || contract.EndDate > today)
                        throw Problems.Invalid("status", "Najam još traje. Za raniji prekid koristite raskid ugovora.");
                    listing.Status = ListingStatusRules.Next(listing.Status, ListingEvent.RentalEnded) ?? Inconsistent();
                }
                else
                {
                    var paid = await ctx.Transactions.AnyAsync(
                        t => t.ContractId == contract.Id && !t.IsDeleted && t.Status == TransactionStatus.Completed, ct);
                    if (!paid)
                        throw Problems.Invalid("status", "Kupoprodaja se ne može završiti bez evidentirane uplate.");
                    listing.Status = ListingStatusRules.Next(listing.Status, ListingEvent.SaleCompleted) ?? Inconsistent();
                }
                break;

            case ContractAction.Terminate:
                if (contract.Status == ContractStatus.Active && type == ContractType.Rent)
                {
                    listing.Status = ListingStatusRules.Next(listing.Status, ListingEvent.RentalEnded) ?? Inconsistent();
                }
                else
                {
                    listing.Status = ListingStatusRules.Next(listing.Status, ListingEvent.ReservationReleased) ?? Inconsistent();
                    request.Status = RequestStatus.Cancelled;
                }
                break;
        }

        contract.Status = next;
        return listing.Status;
    }

    private static ContractType ContractTypeFor(ListingType type) =>
        type == ListingType.Rent ? ContractType.Rent : ContractType.Sale;

    private static ListingStatus Inconsistent() =>
        throw Problems.Invalid("status", "Status oglasa ne odgovara statusu ugovora. Obratite se administratoru.");
}