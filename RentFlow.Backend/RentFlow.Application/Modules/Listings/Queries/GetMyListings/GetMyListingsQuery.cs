using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Queries.GetMyListings
{
    public sealed class GetMyListingsQuery : IRequest<PageResult<GetMyListingsQueryDto>>
    {
        public string? Search { get; init; }
        public ListingStatus? Status { get; init; }
        public ListingType? ListingType { get; init; }
        public int PageNumber { get; init; } = 1;
        public int PageSize { get; init; } = 12;
    }

    public sealed class GetMyListingsQueryValidator : AbstractValidator<GetMyListingsQuery>
    {
        public GetMyListingsQueryValidator()
        {
            RuleFor(x => x.PageNumber).GreaterThanOrEqualTo(1);
            RuleFor(x => x.PageSize).InclusiveBetween(1, 50);
            RuleFor(x => x.Search).MaximumLength(100);
            RuleFor(x => x.Status).IsInEnum();
            RuleFor(x => x.ListingType).IsInEnum();
        }
    }

    public sealed class GetMyListingsQueryDto
    {
        public required int Id { get; init; }
        public required int PropertyId { get; init; }
        public required string Title { get; init; }
        public required ListingType ListingType { get; init; }
        public required ListingStatus Status { get; init; }
        public required decimal Price { get; init; }
        public required string CurrencyCode { get; init; }
        public required decimal? Deposit { get; init; }
        public required bool IsNegotiable { get; init; }
        public required DateTime? PublishedAtUtc { get; init; }
        public required DateTime CreatedAtUtc { get; init; }

        public required string Address { get; init; }
        public required string CityName { get; init; }
        public required PropertyType PropertyType { get; init; }
        public required decimal AreaM2 { get; init; }
        public required int? Rooms { get; init; }
        public required string? MainImageUrl { get; init; }
        public required int PendingRequestsCount { get; init; }
    }
}
