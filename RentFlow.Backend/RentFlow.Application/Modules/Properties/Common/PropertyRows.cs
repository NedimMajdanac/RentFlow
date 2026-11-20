using RentFlow.Application.Abstractions;
using RentFlow.Domain.Entities;
using RentFlow.Domain.Entities.Listing;
using RentFlow.Domain.Entities.Property;
using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Properties.Common;

internal sealed class PropertyRow
{
    public required PropertyEntity Property { get; init; }
    public ListingEntity? Listing { get; init; }   
}

internal static class PropertyRows
{
    public static IQueryable<PropertyRow> OwnedPropertyRows(this IAppDbContext ctx, int? ownerId) =>
        ctx.Properties
            .Where(p => p.OwnerId == ownerId)
            .Select(p => new PropertyRow
            {
                Property = p,
                Listing = p.Listings
                    .Where(l => !l.IsDeleted && l.Status != ListingStatus.Closed)
                    .OrderByDescending(l => l.CreatedAtUtc)
                    .FirstOrDefault()
            });

    public static IQueryable<PropertyRow> WhereStatus(this IQueryable<PropertyRow> rows, PropertyStatus status) =>
        status switch
        {
            PropertyStatus.NoListing => rows.Where(r => r.Listing == null),
            PropertyStatus.InPreparation => rows.Where(r => r.Listing != null && r.Listing.Status == ListingStatus.Draft),
            PropertyStatus.Available => rows.Where(r => r.Listing != null && r.Listing.Status == ListingStatus.Active),
            PropertyStatus.Reserved => rows.Where(r => r.Listing != null && r.Listing.Status == ListingStatus.Reserved),
            PropertyStatus.Rented => rows.Where(r => r.Listing != null && r.Listing.Status == ListingStatus.Rented),
            PropertyStatus.Sold => rows.Where(r => r.Listing != null && r.Listing.Status == ListingStatus.Sold),
            _ => rows
        };
}