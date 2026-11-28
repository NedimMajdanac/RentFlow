using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Requests.Common;

/// <summary>The part of a listing that a request screen needs.</summary>
public sealed class RequestListingDto
{
    public required int Id { get; init; }
    public required string Title { get; init; }
    public required ListingType ListingType { get; init; }
    public required ListingStatus Status { get; init; }
    public required decimal Price { get; init; }
    public required string CurrencyCode { get; init; }
    public required PropertyType PropertyType { get; init; }
    public required string CityName { get; init; }
    public required string? MainImageUrl { get; init; }
}

/// <summary>Public data about a person in a request. Phone number and email are deliberately not exposed.</summary>
public sealed class RequestPartyDto
{
    public required int Id { get; init; }
    public required string Name { get; init; }
    public required bool IsVerified { get; init; }
    public required string? ProfileImageUrl { get; init; }
}