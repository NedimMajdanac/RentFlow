using MediatR;
using Microsoft.EntityFrameworkCore;
using RentFlow.Application.Abstractions;
using RentFlow.Application.Modules.Properties.Common;
using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Properties.Queries.GetMyPropertiesSummary;

public sealed class GetMyPropertiesSummaryQueryHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
    : IRequestHandler<GetMyPropertiesSummaryQuery, GetMyPropertiesSummaryQueryDto>
{
    public async Task<GetMyPropertiesSummaryQueryDto> Handle(GetMyPropertiesSummaryQuery request, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        var rows = ctx.OwnedPropertyRows(userId);

        var total = await rows.CountAsync(ct);
        var available = await rows.CountAsync(r => r.Listing != null && r.Listing.Status == ListingStatus.Active, ct);

        var activeRentals = ctx.Contracts.Where(c => c.SellerOrLandlordId == userId
                                                  && c.ContractType == ContractType.Rent
                                                  && c.Status == ContractStatus.Active);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var limit = today.AddDays(30);

        return new GetMyPropertiesSummaryQueryDto
        {
            TotalCount = total,
            AvailableCount = available,
            ActiveRentals = await activeRentals.CountAsync(ct),
            ExpiringContracts = await activeRentals.CountAsync(c => c.EndDate != null && c.EndDate >= today && c.EndDate <= limit, ct)
        };
    }
}