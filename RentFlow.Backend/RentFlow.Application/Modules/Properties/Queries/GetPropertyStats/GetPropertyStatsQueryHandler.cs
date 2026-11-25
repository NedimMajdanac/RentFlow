using MediatR;
using Microsoft.EntityFrameworkCore;
using RentFlow.Application.Abstractions;
using RentFlow.Application.Common;
using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Properties.Queries.GetPropertyStats;

public sealed class GetPropertyStatsQueryHandler(IAppDbContext ctx, IAppCurrentUser currentUser, TimeProvider time)
    : IRequestHandler<GetPropertyStatsQuery, GetPropertyStatsQueryDto>
{
    private const int ChartDays = 14;

    public async Task<GetPropertyStatsQueryDto> Handle(GetPropertyStatsQuery request, CancellationToken ct)
    {
        var id = request.PropertyId;

        // Owner or admin only; everybody else gets "not found" so foreign properties are not revealed.
        var allowed = await ctx.Properties.AsNoTracking()
            .AnyAsync(p => p.Id == id && !p.IsDeleted && (p.OwnerId == currentUser.UserId || currentUser.IsAdmin), ct);
        if (!allowed) throw Problems.NotFound("Nekretnina nije pronađena.");

        var now = time.GetUtcNow().UtcDateTime;
        var today = now.Date;
        var chartFrom = today.AddDays(-(ChartDays - 1));
        var last30 = now.AddDays(-30);

        var views = ctx.ListingViews.AsNoTracking().Where(v => !v.IsDeleted && v.Listing.PropertyId == id);

        var totalViews = await views.CountAsync(ct);
        var viewsLast30 = await views.CountAsync(v => v.CreatedAtUtc >= last30, ct);
        var uniqueViewers = await views.Select(v => v.ViewerId).Distinct().CountAsync(ct);

        var perDay = await views
            .Where(v => v.CreatedAtUtc >= chartFrom)
            .GroupBy(v => v.CreatedAtUtc.Date)
            .Select(g => new { Day = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        // days without views are filled with zeros so the chart has no gaps
        var chart = Enumerable.Range(0, ChartDays)
            .Select(i => chartFrom.AddDays(i))
            .Select(day => new DailyCountDto
            {
                Date = DateOnly.FromDateTime(day),
                Count = perDay.FirstOrDefault(x => x.Day == day)?.Count ?? 0
            })
            .ToList();

        var requests = ctx.Requests.AsNoTracking().Where(r => !r.IsDeleted && r.Listing.PropertyId == id);
        var totalRequests = await requests.CountAsync(ct);
        var pendingRequests = await requests.CountAsync(r => r.Status == RequestStatus.Pending, ct);

        var contracts = ctx.Contracts.AsNoTracking().Where(c => !c.IsDeleted && c.Request.Listing.PropertyId == id);
        var totalContracts = await contracts.CountAsync(ct);
        var activeContracts = await contracts.CountAsync(c => c.Status == ContractStatus.Active, ct);

        var paymentQuery = ctx.Transactions.AsNoTracking()
            .Where(t => !t.IsDeleted
                     && t.Status == TransactionStatus.Completed
                     && t.Contract.Request.Listing.PropertyId == id);

        var paymentsCount = await paymentQuery.CountAsync(ct);
        var payments = await paymentQuery
            .GroupBy(t => t.OriginalCurrency.Code)   
            .Select(g => new CurrencyAmountDto { CurrencyCode = g.Key, Amount = g.Sum(t => t.OriginalAmount) })
            .ToListAsync(ct);

        return new GetPropertyStatsQueryDto
        {
            TotalViews = totalViews,
            Last30DaysViews = viewsLast30,
            UniqueViewers = uniqueViewers,
            ViewsPerDay = chart,
            TotalRequests = totalRequests,
            PendingRequests = pendingRequests,
            ActiveContracts = activeContracts,
            TotalContracts = totalContracts,
            Payments = payments.OrderBy(p => p.CurrencyCode).ToList(),
            PaymentsCount = paymentsCount
        };
    }
}