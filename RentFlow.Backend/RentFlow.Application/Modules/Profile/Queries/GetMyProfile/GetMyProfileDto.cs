using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Profile.Queries.GetMyProfile
{
    public sealed class GetMyProfileQueryDto
    {
        public required int Id { get; init; }
        public required string Firstname { get; init; }
        public required string Lastname { get; init; }
        public required string Email { get; init; }
        public required string? Phone { get; init; }
        public required string? Address { get; init; }
        public required string? City { get; init; }
        public required string? ProfileDescription { get; init; }
        public required string? ProfileImageUrl { get; init; }
        public required string? CoverImageUrl { get; init; }
        public required bool IsVerified { get; init; }
        public required bool IsEnabled { get; init; }
        public required DateTime MemberSinceUtc { get; init; }
        public required int PropertiesCount { get; init; }
        public required FeaturedListingDto? FeaturedListing { get; init; }
        public required List<SavedListingDto> SavedListings { get; init; }
    }

    /// <summary>The owner's most recent active listing (right-hand card).</summary>
    public sealed class FeaturedListingDto
    {
        public required int ListingId { get; init; }
        public required string Title { get; init; }
        public required string? Description { get; init; }
        public required decimal Price { get; init; }
        public required string CurrencyCode { get; init; }
        public required string? MainImageUrl { get; init; }
    }

    public sealed class SavedListingDto
    {
        public required int ListingId { get; init; }
        public required string Title { get; init; }
        public required string CityName { get; init; }
        public required string PropertyType { get; init; }   // Apartment, House...
        public required string ListingType { get; init; }    // Rent, Sale
        public required decimal Price { get; init; }
        public required string CurrencyCode { get; init; }
        public required string? MainImageUrl { get; init; }
    }
}
