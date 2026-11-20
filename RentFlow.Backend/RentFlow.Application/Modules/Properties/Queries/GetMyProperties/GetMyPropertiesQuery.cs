using MediatR;
using RentFlow.Application.Modules.Properties.Common;
using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Properties.Queries.GetMyProperties;

public enum PropertySort { Newest, Oldest, Title }

public sealed class GetMyPropertiesQuery : IRequest<PageResult<GetMyPropertiesQueryDto>>
{
    public string? Search { get; init; }              
    public PropertyType? PropertyType { get; init; }
    public int? CityId { get; init; }
    public PropertyStatus? Status { get; init; }
    public ListingType? ListingType { get; init; }
    public PropertySort Sort { get; init; } = PropertySort.Newest;
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 8;
}

public sealed class GetMyPropertiesQueryDto
{
    public required int Id { get; init; }
    public required string Title { get; init; }       
    public required string Address { get; init; }
    public required int CityId { get; init; }
    public required string CityName { get; init; }
    public required PropertyType PropertyType { get; init; }
    public required decimal AreaM2 { get; init; }
    public required int? Rooms { get; init; }
    public required string? MainImageUrl { get; init; }
    public required DateTime CreatedAtUtc { get; init; }

    public required PropertyStatus Status { get; init; }
    public required ListingType? ListingType { get; init; }
    public required decimal? Price { get; init; }
    public required string? CurrencyCode { get; init; }
    public required string? TenantName { get; init; }
}