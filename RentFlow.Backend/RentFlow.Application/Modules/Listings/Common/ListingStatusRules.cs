using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Listings.Common;

/// <summary>Changes made by the listing owner.</summary>
public enum ListingAction { Publish, Unpublish, Close, Reopen }

/// <summary>Changes caused by requests and contracts; the owner cannot trigger these directly.</summary>
public enum ListingEvent { RequestAccepted, ReservationReleased, RentalStarted, RentalEnded, SaleCompleted }

/// <summary>The single source of truth for listing status transitions.</summary>
public static class ListingStatusRules
{
    /// <summary>Statuses in which a listing is visible to other users.</summary>
    public static readonly ListingStatus[] PublicStatuses = [ListingStatus.Active, ListingStatus.Reserved];

    public static bool IsEditable(ListingStatus status) => status is ListingStatus.Draft or ListingStatus.Active;

    /// <summary>Only an active listing takes new requests.</summary>
    public static bool AcceptsRequests(ListingStatus status) => status == ListingStatus.Active;

    /// <summary>Owner transitions. Returns the new status, or null when the action is not allowed.</summary>
    public static ListingStatus? Apply(ListingStatus current, ListingAction action) => (current, action) switch
    {
        (ListingStatus.Draft, ListingAction.Publish) => ListingStatus.Active,
        (ListingStatus.Active, ListingAction.Unpublish) => ListingStatus.Draft,
        (ListingStatus.Draft or ListingStatus.Active, ListingAction.Close) => ListingStatus.Closed,
        (ListingStatus.Closed, ListingAction.Reopen) => ListingStatus.Draft,
        _ => null
    };

    /// <summary>System transitions. Returns the new status, or null when the event does not fit the status.</summary>
    public static ListingStatus? Next(ListingStatus current, ListingEvent ev) => (current, ev) switch
    {
        (ListingStatus.Active, ListingEvent.RequestAccepted) => ListingStatus.Reserved,
        (ListingStatus.Reserved, ListingEvent.ReservationReleased) => ListingStatus.Active,
        (ListingStatus.Reserved, ListingEvent.RentalStarted) => ListingStatus.Rented,
        (ListingStatus.Rented, ListingEvent.RentalEnded) => ListingStatus.Closed,
        (ListingStatus.Reserved, ListingEvent.SaleCompleted) => ListingStatus.Sold,
        _ => null
    };
}