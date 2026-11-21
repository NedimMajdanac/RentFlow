using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Properties.Common;

/// <summary>Property status in the view; derived from its current listing.</summary>
public enum PropertyStatus { NoListing, InPreparation, Available, Reserved, Rented, Sold }

public static class PropertyStatusMapper
{
    public static PropertyStatus From(ListingStatus? status) => status switch
    {
        ListingStatus.Draft => PropertyStatus.InPreparation,
        ListingStatus.Active => PropertyStatus.Available,
        ListingStatus.Reserved => PropertyStatus.Reserved,
        ListingStatus.Rented => PropertyStatus.Rented,
        ListingStatus.Sold => PropertyStatus.Sold,
        _ => PropertyStatus.NoListing
    };
}