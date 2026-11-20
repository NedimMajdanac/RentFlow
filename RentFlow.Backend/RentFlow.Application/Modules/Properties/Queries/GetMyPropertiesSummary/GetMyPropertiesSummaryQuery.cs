using MediatR;

namespace RentFlow.Application.Modules.Properties.Queries.GetMyPropertiesSummary;

public sealed class GetMyPropertiesSummaryQuery : IRequest<GetMyPropertiesSummaryQueryDto>;

public sealed class GetMyPropertiesSummaryQueryDto
{
    public required int TotalCount { get; init; }
    public required int ActiveRentals { get; init; }
    public required int AvailableCount { get; init; }
    public required int ExpiringContracts { get; init; }   
}