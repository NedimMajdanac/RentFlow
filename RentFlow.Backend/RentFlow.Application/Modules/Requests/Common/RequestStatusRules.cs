using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Requests.Common;

public enum RequestAction { Accept, Reject, Cancel }

public static class RequestStatusRules
{
    public static RequestStatus? Apply(RequestStatus current, RequestAction action) => (current, action) switch
    {
        (RequestStatus.Pending, RequestAction.Accept) => RequestStatus.Accepted,
        (RequestStatus.Pending or RequestStatus.Accepted, RequestAction.Reject) => RequestStatus.Rejected,
        (RequestStatus.Pending or RequestStatus.Accepted, RequestAction.Cancel) => RequestStatus.Cancelled,
        _ => null
    };
    
    /// <summary>
    /// Whether the requester can still withdraw the request: pending ones always, accepted ones only while
    /// the listing is merely reserved and no contract is active yet.
    /// </summary>
    public static bool CanBeCancelled(RequestStatus status, ListingStatus listingStatus, ContractStatus? liveContract) =>
        status == RequestStatus.Pending
        || (status == RequestStatus.Accepted && listingStatus == ListingStatus.Reserved && liveContract != ContractStatus.Active);
}