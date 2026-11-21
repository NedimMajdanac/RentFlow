using RentFlow.Application.Modules.Properties.Common;
using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Queries.GetListingById
{
    public sealed record GetListingByIdQuery(int Id) : IRequest<GetListingByIdQueryDto>;

    public sealed class GetListingByIdQueryDto
    {
        public required int Id { get; init; }
        public required ListingType ListingType { get; init; }
        public required string Title { get; init; }
        public required decimal Price { get; init; }
        public required int CurrencyId { get; init; }
        public required string CurrencyCode { get; init; }
        public required decimal? Deposit { get; init; }
        public required bool IsNegotiable { get; init; }
        public required ListingStatus Status { get; init; }
        public required DateTime? PublishedAtUtc { get; init; }
        public required DateTime CreatedAtUtc { get; init; }

        public required bool IsOwner { get; init; }
        public required bool IsFavorite { get; init; }

        public required ListingPropertyDto Property { get; init; }
        public required ListingOwnerDto Owner { get; init; }
    }

    public sealed class ListingPropertyDto
    {
        public required int Id { get; init; }
        public required PropertyType PropertyType { get; init; }
        public required string Address { get; init; }
        public required int CityId { get; init; }
        public required string CityName { get; init; }
        public required string? Description { get; init; }
        public required decimal AreaM2 { get; init; }
        public required decimal? PlotAreaM2 { get; init; }
        public required int? Rooms { get; init; }
        public required int? Bathrooms { get; init; }
        public required int? Floor { get; init; }
        public required int? TotalFloors { get; init; }
        public required int? YearBuilt { get; init; }
        public required HeatingType? HeatingType { get; init; }
        public required FurnishedStatus? FurnishedStatus { get; init; }
        public required PropertyCondition? Condition { get; init; }
        public required decimal? Latitude { get; init; }
        public required decimal? Longitude { get; init; }
        public required List<PropertyImageDto> Images { get; init; }
        public required List<PropertyAmenityDto> Amenities { get; init; }
    }

    /// <summary>public information about the owner. Phone and email are intentionally not returned.</summary>
    public sealed class ListingOwnerDto
    {
        public required int Id { get; init; }
        public required string Name { get; init; }
        public required bool IsVerified { get; init; }
        public required string? ProfileImageUrl { get; init; }
        public required DateTime MemberSinceUtc { get; init; }
    }
}
