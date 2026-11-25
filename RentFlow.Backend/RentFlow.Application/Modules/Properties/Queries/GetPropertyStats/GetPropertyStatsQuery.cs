using MediatR;

namespace RentFlow.Application.Modules.Properties.Queries.GetPropertyStats;

public sealed record GetPropertyStatsQuery(int PropertyId) : IRequest<GetPropertyStatsQueryDto>;

public sealed class GetPropertyStatsQueryDto
{
    public required int TotalViews { get; init; }
    public required int Last30DaysViews { get; init; }
    public required int UniqueViewers { get; init; }
    public required List<DailyCountDto> ViewsPerDay { get; init; }   // last 14 days, oldest first

    public required int TotalRequests { get; init; }
    public required int PendingRequests { get; init; }

    public required int ActiveContracts { get; init; }
    public required int TotalContracts { get; init; }

    public required List<CurrencyAmountDto> Payments { get; init; }  // completed payments per contract currency
    public required int PaymentsCount { get; init; }
}

public sealed class DailyCountDto
{
    public required DateOnly Date { get; init; }
    public required int Count { get; init; }
}

public sealed class CurrencyAmountDto
{
    public required string CurrencyCode { get; init; }
    public required decimal Amount { get; init; }
}