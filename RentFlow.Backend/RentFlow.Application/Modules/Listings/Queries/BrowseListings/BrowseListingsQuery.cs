using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Queries.BrowseListings
{
    public enum ListingSort { Newest, PriceAsc, PriceDesc }

    public sealed class BrowseListingsQuery : IRequest<PageResult<BrowseListingsQueryDto>>
    {
        public string? Search { get; init; }              
        public ListingType? ListingType { get; init; }
        public PropertyType? PropertyType { get; init; }
        public int? CityId { get; init; }

        public int? CurrencyId { get; init; }
        public decimal? MinPrice { get; init; }
        public decimal? MaxPrice { get; init; }

        public int? MinRooms { get; init; }
        public decimal? MinAreaM2 { get; init; }
        public decimal? MaxAreaM2 { get; init; }
        public List<int> AmenityIds { get; init; } = new();   

        public ListingSort Sort { get; init; } = ListingSort.Newest;
        public int PageNumber { get; init; } = 1;
        public int PageSize { get; init; } = 12;
    }

    public sealed class BrowseListingsQueryValidator : AbstractValidator<BrowseListingsQuery>
    {
        public BrowseListingsQueryValidator()
        {
            RuleFor(x => x.PageNumber).GreaterThanOrEqualTo(1);
            RuleFor(x => x.PageSize).InclusiveBetween(1, 50);
            RuleFor(x => x.Search).MaximumLength(100);
            RuleFor(x => x.ListingType).IsInEnum();
            RuleFor(x => x.PropertyType).IsInEnum();
            RuleFor(x => x.Sort).IsInEnum();

            RuleFor(x => x.MinPrice).GreaterThanOrEqualTo(0);
            RuleFor(x => x.MaxPrice).GreaterThanOrEqualTo(0);
            RuleFor(x => x.MaxPrice).GreaterThanOrEqualTo(x => x.MinPrice!.Value)
                .When(x => x.MinPrice.HasValue && x.MaxPrice.HasValue)
                .WithMessage("Najveća cijena ne može biti manja od najmanje.");

            RuleFor(x => x.CurrencyId).NotNull()
                .When(x => x.MinPrice.HasValue || x.MaxPrice.HasValue || x.Sort != ListingSort.Newest)
                .WithMessage("Za filtriranje ili sortiranje po cijeni odaberite valutu.");

            RuleFor(x => x.MinRooms).InclusiveBetween(0, 50);
            RuleFor(x => x.MinAreaM2).GreaterThanOrEqualTo(0);
            RuleFor(x => x.MaxAreaM2).GreaterThanOrEqualTo(0);
            RuleFor(x => x.AmenityIds).Must(ids => ids.Count <= 30).WithMessage("Najviše 30 pogodnosti.");
        }
    }

    public sealed class BrowseListingsQueryDto
    {
        public required int Id { get; init; }
        public required string Title { get; init; }
        public required ListingType ListingType { get; init; }
        public required ListingStatus Status { get; init; }   
        public required decimal Price { get; init; }
        public required string CurrencyCode { get; init; }
        public required bool IsNegotiable { get; init; }
        public required DateTime? PublishedAtUtc { get; init; }

        public required PropertyType PropertyType { get; init; }
        public required string Address { get; init; }
        public required string CityName { get; init; }
        public required decimal AreaM2 { get; init; }
        public required int? Rooms { get; init; }
        public required string? MainImageUrl { get; init; }
        public required bool IsFavorite { get; init; }
    }
}
