using RentFlow.Application.Modules.Contracts.Common;
using RentFlow.Application.Modules.Listings.Common;
using RentFlow.Application.Modules.Requests.Common;
using RentFlow.Domain.Enums;
using Xunit;

public class StatusRulesTests
{
    [Theory]
    [InlineData(ListingStatus.Draft, ListingAction.Publish, ListingStatus.Active)]
    [InlineData(ListingStatus.Active, ListingAction.Unpublish, ListingStatus.Draft)]
    [InlineData(ListingStatus.Draft, ListingAction.Close, ListingStatus.Closed)]
    [InlineData(ListingStatus.Active, ListingAction.Close, ListingStatus.Closed)]
    [InlineData(ListingStatus.Closed, ListingAction.Reopen, ListingStatus.Draft)]
    public void Owner_actions_follow_the_table(ListingStatus from, ListingAction action, ListingStatus expected)
        => Assert.Equal(expected, ListingStatusRules.Apply(from, action));

    [Fact]
    public void Owner_cannot_change_reserved_rented_or_sold_listings()
    {
        foreach (var status in new[] { ListingStatus.Reserved, ListingStatus.Rented, ListingStatus.Sold })
            foreach (var action in Enum.GetValues<ListingAction>())
                Assert.Null(ListingStatusRules.Apply(status, action));
    }

    [Theory]
    [InlineData(ListingStatus.Active, ListingEvent.RequestAccepted, ListingStatus.Reserved)]
    [InlineData(ListingStatus.Reserved, ListingEvent.ReservationReleased, ListingStatus.Active)]
    [InlineData(ListingStatus.Reserved, ListingEvent.RentalStarted, ListingStatus.Rented)]
    [InlineData(ListingStatus.Rented, ListingEvent.RentalEnded, ListingStatus.Closed)]
    [InlineData(ListingStatus.Reserved, ListingEvent.SaleCompleted, ListingStatus.Sold)]
    public void System_events_follow_the_table(ListingStatus from, ListingEvent ev, ListingStatus expected)
        => Assert.Equal(expected, ListingStatusRules.Next(from, ev));

    [Theory]
    [InlineData(ListingStatus.Draft, ListingEvent.RequestAccepted)]
    [InlineData(ListingStatus.Rented, ListingEvent.SaleCompleted)]
    [InlineData(ListingStatus.Sold, ListingEvent.ReservationReleased)]
    [InlineData(ListingStatus.Closed, ListingEvent.RentalStarted)]
    public void System_events_in_a_wrong_status_are_rejected(ListingStatus from, ListingEvent ev)
        => Assert.Null(ListingStatusRules.Next(from, ev));

    [Fact]
    public void Only_active_listings_accept_requests()
    {
        foreach (var status in Enum.GetValues<ListingStatus>())
            Assert.Equal(status == ListingStatus.Active, ListingStatusRules.AcceptsRequests(status));
    }

    [Theory]
    [InlineData(RequestStatus.Pending, RequestAction.Accept, RequestStatus.Accepted)]
    [InlineData(RequestStatus.Pending, RequestAction.Reject, RequestStatus.Rejected)]
    [InlineData(RequestStatus.Accepted, RequestAction.Cancel, RequestStatus.Cancelled)]
    public void Request_transitions(RequestStatus from, RequestAction action, RequestStatus expected)
        => Assert.Equal(expected, RequestStatusRules.Apply(from, action));

    [Theory]
    [InlineData(RequestStatus.Accepted, RequestAction.Accept)]
    [InlineData(RequestStatus.Rejected, RequestAction.Cancel)]
    [InlineData(RequestStatus.Cancelled, RequestAction.Reject)]
    public void Closed_requests_cannot_be_changed(RequestStatus from, RequestAction action)
        => Assert.Null(RequestStatusRules.Apply(from, action));

    [Theory]
    [InlineData(ContractStatus.Draft, ContractAction.Activate, ContractStatus.Active)]
    [InlineData(ContractStatus.Active, ContractAction.Complete, ContractStatus.Completed)]
    [InlineData(ContractStatus.Draft, ContractAction.Terminate, ContractStatus.Terminated)]
    [InlineData(ContractStatus.Active, ContractAction.Terminate, ContractStatus.Terminated)]
    public void Contract_transitions(ContractStatus from, ContractAction action, ContractStatus expected)
        => Assert.Equal(expected, ContractStatusRules.Apply(from, action));

    [Fact]
    public void Completed_and_terminated_contracts_are_final()
    {
        foreach (var status in new[] { ContractStatus.Completed, ContractStatus.Terminated })
            foreach (var action in Enum.GetValues<ContractAction>())
                Assert.Null(ContractStatusRules.Apply(status, action));
    }
}

public class RentalPeriodsTests
{
    private static DateOnly D(int day) => new(2027, 1, day);

    [Theory]
    [InlineData(1, 10, 5, 15, true)]    
    [InlineData(1, 10, 10, 20, true)]   
    [InlineData(1, 10, 11, 20, false)]  
    [InlineData(5, 8, 1, 20, true)]     
    public void Overlap_is_inclusive(int aStart, int aEnd, int bStart, int bEnd, bool expected)
        => Assert.Equal(expected, RentalPeriods.Overlap(D(aStart), D(aEnd), D(bStart), D(bEnd)));

    [Fact]
    public void Open_ended_rental_overlaps_every_later_period()
        => Assert.True(RentalPeriods.Overlap(D(1), null, D(20), D(25)));
}