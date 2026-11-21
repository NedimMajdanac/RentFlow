using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Common
{
    public enum ListingAction { Publish, Unpublish, Close, Reopen }

    public static class ListingStatusRules
    {
        /// <summary>Status that are visible to other users.</summary>
        public static readonly ListingStatus[] PublicStatuses = [ListingStatus.Active, ListingStatus.Reserved];

        public static bool IsEditable(ListingStatus status) => status is ListingStatus.Draft or ListingStatus.Active;

        /// <summary>Transitions that can be triggered by the system. Returns the new status or null if the action is not allowed.</summary>
        public static ListingStatus? Apply(ListingStatus current, ListingAction action) => (current, action) switch
        {
            (ListingStatus.Draft, ListingAction.Publish) => ListingStatus.Active,
            (ListingStatus.Active, ListingAction.Unpublish) => ListingStatus.Draft,
            (ListingStatus.Draft or ListingStatus.Active, ListingAction.Close) => ListingStatus.Closed,
            (ListingStatus.Closed, ListingAction.Reopen) => ListingStatus.Draft,
            _ => null
        };

        /// <summary>Transitions that will be triggered by requests and contracts (next issue).</summary>
        public static bool CanSystemTransition(ListingStatus from, ListingStatus to) => (from, to) switch
        {
            (ListingStatus.Active, ListingStatus.Reserved) => true,
            (ListingStatus.Reserved, ListingStatus.Active) => true,
            (ListingStatus.Reserved, ListingStatus.Rented) => true,
            (ListingStatus.Reserved, ListingStatus.Sold) => true,
            (ListingStatus.Rented, ListingStatus.Closed) => true,
            _ => false
        };
    }
}
