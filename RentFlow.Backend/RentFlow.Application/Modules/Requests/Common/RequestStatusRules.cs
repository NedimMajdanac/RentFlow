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
}