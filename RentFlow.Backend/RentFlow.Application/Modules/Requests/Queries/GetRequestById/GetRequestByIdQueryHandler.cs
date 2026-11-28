using RentFlow.Application.Modules.Requests.Common;
using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Requests.Queries.GetRequestById
{
    public sealed class GetRequestByIdQueryHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
    : IRequestHandler<GetRequestByIdQuery, GetRequestByIdQueryDto>
    {
        public async Task<GetRequestByIdQueryDto> Handle(GetRequestByIdQuery query, CancellationToken ct)
        {
            var userId = currentUser.UserId;
            var isAdmin = currentUser.IsAdmin;

            var x = await ctx.Requests.AsNoTracking()
                .Where(r => r.Id == query.Id && !r.IsDeleted
                         && (r.RequesterId == userId || r.Listing.Property.OwnerId == userId || isAdmin))
                .Select(r => new
                {
                    r.Id,
                    r.Status,
                    r.Message,
                    r.DesiredStartDate,
                    r.DesiredEndDate,
                    r.CreatedAtUtc,
                    r.RespondedAtUtc,
                    r.RequesterId,
                    OwnerId = r.Listing.Property.OwnerId,
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
                    },
                    Requester = new RequestPartyDto
                    {
                        Id = r.Requester.Id,
                        Name = r.Requester.Firstname + " " + r.Requester.Lastname,
                        IsVerified = r.Requester.IsVerified,
                        ProfileImageUrl = r.Requester.ProfileImageUrl
                    },
                    Owner = new RequestPartyDto
                    {
                        Id = r.Listing.Property.Owner.Id,
                        Name = r.Listing.Property.Owner.Firstname + " " + r.Listing.Property.Owner.Lastname,
                        IsVerified = r.Listing.Property.Owner.IsVerified,
                        ProfileImageUrl = r.Listing.Property.Owner.ProfileImageUrl
                    }
                })
                .FirstOrDefaultAsync(ct)
                ?? throw Problems.NotFound("Zahtjev nije pronađen.");

            var isRequester = x.RequesterId == userId;
            var isOwner = x.OwnerId == userId;

            return new GetRequestByIdQueryDto
            {
                Id = x.Id,
                Status = x.Status,
                Message = x.Message,
                DesiredStartDate = x.DesiredStartDate,
                DesiredEndDate = x.DesiredEndDate,
                CreatedAtUtc = x.CreatedAtUtc,
                RespondedAtUtc = x.RespondedAtUtc,
                IsRequester = isRequester,
                IsOwner = isOwner,
                CanCancel = (isRequester || isAdmin)
                            && RequestStatusRules.CanBeCancelled(x.Status, x.Listing.Status, x.LiveContract?.Status),
                CanRespond = (isOwner || isAdmin) && x.Status == RequestStatus.Pending,
                ContractId = x.LiveContract?.Id,
                Listing = x.Listing,
                Requester = x.Requester,
                Owner = x.Owner
            };
        }
    }
}
