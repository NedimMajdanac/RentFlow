using Microsoft.EntityFrameworkCore;
using RentFlow.Application.Abstractions;
using RentFlow.Application.Common;
using RentFlow.Application.Modules.Contracts.Common;
using RentFlow.Domain.Entities;
using RentFlow.Domain.Entities.Deals;
using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Properties.Common;

/// <summary>Rules that stop incompatible processes (listings, rentals, sales) on the same property.</summary>
public static class PropertyAvailability
{
    private static readonly ContractStatus[] LiveStatuses = [ContractStatus.Draft, ContractStatus.Active];

    /// <summary>Contracts that currently occupy the property (not yet completed or terminated).</summary>
    public static IQueryable<ContractEntity> LiveContracts(this IAppDbContext ctx, int propertyId) =>
        ctx.Contracts.Where(c => !c.IsDeleted
                              && LiveStatuses.Contains(c.Status)
                              && c.Request.Listing.PropertyId == propertyId);

    /// <summary>
    /// A new listing (or publishing or reopening one) is allowed only when the property has no other open
    /// listing and no contract in progress. A sold property stays blocked because ownership transfer is not modelled.
    /// </summary>
    public static async Task EnsureListingCanBeCreatedAsync(
        this IAppDbContext ctx, int propertyId, int? exceptListingId, CancellationToken ct)
    {
        var blocking = await ctx.Listings.AsNoTracking()
            .Where(l => l.PropertyId == propertyId && l.Id != exceptListingId
                     && !l.IsDeleted && l.Status != ListingStatus.Closed)
            .Select(l => (ListingStatus?)l.Status)
            .FirstOrDefaultAsync(ct);

        if (blocking == ListingStatus.Sold)
            throw Problems.Invalid("propertyId", "Nekretnina je prodana i za nju se ne može napraviti novi oglas.");
        if (blocking is not null)
            throw Problems.Invalid("propertyId", "Nekretnina već ima oglas koji nije zatvoren.");

        if (await ctx.LiveContracts(propertyId).AnyAsync(ct))
            throw Problems.Invalid("propertyId", "Nekretnina ima ugovor koji je u toku.");
    }

    /// <summary>
    /// Checks a planned contract (or an accepted request) against the contracts already in progress:
    /// a sale excludes everything else, and two rentals must not overlap in time.
    /// </summary>
    public static async Task EnsureNoConflictingContractAsync(
        this IAppDbContext ctx, int propertyId, ContractType type,
        DateOnly? start, DateOnly? end, int excludeContractId, CancellationToken ct)
    {
        var live = await ctx.LiveContracts(propertyId)
            .Where(c => c.Id != excludeContractId)
            .Select(c => new { c.ContractType, c.StartDate, c.EndDate })
            .ToListAsync(ct);

        foreach (var other in live)
        {
            if (type == ContractType.Sale || other.ContractType == ContractType.Sale)
                throw Problems.Invalid("status", "Za nekretninu je već u toku drugi proces (najam ili kupoprodaja).");

            if (start is { } s && RentalPeriods.Overlap(s, end, other.StartDate, other.EndDate))
                throw Problems.Invalid("status", "Period najma se preklapa s drugim najmom iste nekretnine.");
        }
    }
}