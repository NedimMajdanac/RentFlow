using RentFlow.Application.Modules.Requests.Common;
using RentFlow.Domain.Enums;
using Xunit;

public class RequestPeriodRulesTests
{
    private static readonly DateOnly Today = new(2027, 3, 10);
    private static DateOnly D(int day) => new(2027, 4, day);

    [Fact]
    public void Valid_rental_period_has_no_errors()
        => Assert.Empty(RequestPeriodRules.Validate(ListingType.Rent, D(1), D(30), Today));

    [Fact]
    public void Rental_requires_both_dates()
    {
        var errors = RequestPeriodRules.Validate(ListingType.Rent, null, null, Today);
        Assert.Contains(errors, e => e.Field == "DesiredStartDate");
        Assert.Contains(errors, e => e.Field == "DesiredEndDate");
    }

    [Fact]
    public void Start_in_the_past_is_rejected()
        => Assert.Contains(RequestPeriodRules.Validate(ListingType.Rent, new DateOnly(2027, 3, 9), D(30), Today),
                           e => e.Field == "DesiredStartDate");

    [Fact]
    public void Start_today_is_allowed()
        => Assert.Empty(RequestPeriodRules.Validate(ListingType.Rent, Today, D(30), Today));

    [Theory]
    [InlineData(10, 10)]   // same day
    [InlineData(10, 5)]    // end before start
    public void End_must_be_after_start(int start, int end)
        => Assert.Contains(RequestPeriodRules.Validate(ListingType.Rent, D(start), D(end), Today),
                           e => e.Field == "DesiredEndDate");

    [Fact]
    public void Rental_longer_than_ten_years_is_rejected()
        => Assert.Contains(RequestPeriodRules.Validate(ListingType.Rent, D(1), D(1).AddYears(11), Today),
                           e => e.Field == "DesiredEndDate");

    [Fact]
    public void Purchase_request_must_not_have_a_period()
    {
        Assert.Empty(RequestPeriodRules.Validate(ListingType.Sale, null, null, Today));
        Assert.NotEmpty(RequestPeriodRules.Validate(ListingType.Sale, D(1), null, Today));
    }
}

public class CanBeCancelledTests
{
    [Fact]
    public void Pending_request_can_always_be_cancelled()
    {
        foreach (var status in Enum.GetValues<ListingStatus>())
            Assert.True(RequestStatusRules.CanBeCancelled(RequestStatus.Pending, status, null));
    }

    [Theory]
    [InlineData(ListingStatus.Reserved, null, true)]
    [InlineData(ListingStatus.Reserved, ContractStatus.Draft, true)]
    [InlineData(ListingStatus.Reserved, ContractStatus.Active, false)]
    [InlineData(ListingStatus.Rented, null, false)]
    [InlineData(ListingStatus.Sold, null, false)]
    public void Accepted_request_depends_on_the_listing_and_contract(
        ListingStatus listing, ContractStatus? contract, bool expected)
        => Assert.Equal(expected, RequestStatusRules.CanBeCancelled(RequestStatus.Accepted, listing, contract));

    [Theory]
    [InlineData(RequestStatus.Rejected)]
    [InlineData(RequestStatus.Cancelled)]
    public void Closed_requests_cannot_be_cancelled(RequestStatus status)
        => Assert.False(RequestStatusRules.CanBeCancelled(status, ListingStatus.Active, null));
}