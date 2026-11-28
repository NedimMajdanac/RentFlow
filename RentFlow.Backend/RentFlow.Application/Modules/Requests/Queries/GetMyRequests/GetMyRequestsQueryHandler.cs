using MediatR;
using Microsoft.EntityFrameworkCore;
using RentFlow.Application.Abstractions;
using RentFlow.Application.Common;
using RentFlow.Application.Modules.Requests.Common;
using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Requests.Queries.GetMyRequests;

public sealed class GetMyRequestsQueryHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
    : IRequestHandler<GetMyRequestsQuery, PageResult<GetMyRequestsQueryDto>>
{
    public async Task<PageResult<GetMyRequestsQueryDto>> Handle(GetMyRequestsQuery request, CancellationToken ct)
    {
        var query = ctx.Requests.AsNoTracking()
            .Where(r => !r.IsDeleted && r.RequesterId == currentUser.UserId);

        if (request.Status is { } status) query = query.Where(r => r.Status == status);
        if (request.ListingType is { } type) query = query.Where(r => r.Listing.ListingType == type);

        var total = await query.CountAsync(ct);

        var rows = await query
            .OrderByDescending(r => r.CreatedAtUtc).ThenByDescending(r => r.Id)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(r => new
            {
                r.Id,
                r.Status,
                r.Message,
                r.DesiredStartDate,
                r.DesiredEndDate,
                r.CreatedAtUtc,
                r.RespondedAtUtc,
                OwnerName = r.Listing.Property.Owner.Firstname + " " + r.Listing.Property.Owner.Lastname,
                LiveContract = ctx.Contracts
                    .Where(c => c.RequestId == r.Id && !c.IsDeleted
                             && (c.Status == ContractStatus.Draft || c.Status == ContractStatus.Active))
                    .Select(c => new { c.Id, c.Status })
                    .FirstOrDefault(),
                Listing = new RequestListingDto
                {
                    Id = r.Listing.Id,
                    Title = r.Listing.Title,
                    ListingType = r.Listing.ListingType,
                    Status = r.Listing.Status,
                    Price = r.Listing.Price,
                    CurrencyCode = r.Listing.Currency.Code,   
                    PropertyType = r.Listing.Property.PropertyType,
                    CityName = r.Listing.Property.City.Name,
                    MainImageUrl = r.Listing.Property.Images
                        .Where(i => !i.IsDeleted)
                        .OrderByDescending(i => i.IsMain).ThenBy(i => i.SortOrder)
                        .Select(i => i.Url).FirstOrDefault()
                }
            })
            .ToListAsync(ct);

        var items = rows.Select(x => new GetMyRequestsQueryDto
        {
            Id = x.Id,
            Status = x.Status,
            Message = x.Message,
            DesiredStartDate = x.DesiredStartDate,
            DesiredEndDate = x.DesiredEndDate,
            CreatedAtUtc = x.CreatedAtUtc,
            RespondedAtUtc = x.RespondedAtUtc,
            CanCancel = RequestStatusRules.CanBeCancelled(x.Status, x.Listing.Status, x.LiveContract?.Status),
            ContractId = x.LiveContract?.Id,
            OwnerName = x.OwnerName,
            Listing = x.Listing
        }).ToList();

        return new PageResult<GetMyRequestsQueryDto>
        {
            Items = items,
            PageSize = request.PageSize,
            CurrentPage = request.PageNumber,
            IncludedTotal = true,
            TotalItems = total,
            TotalPages = (int)Math.Ceiling(total / (double)request.PageSize)
        };
    }
}