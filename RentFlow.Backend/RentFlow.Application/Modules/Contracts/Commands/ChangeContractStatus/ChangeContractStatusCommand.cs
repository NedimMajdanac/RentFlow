using MediatR;
using Microsoft.EntityFrameworkCore;
using RentFlow.Application.Abstractions;
using RentFlow.Application.Common;
using RentFlow.Application.Modules.Contracts.Common;
using RentFlow.Application.Modules.Listings.Common;
using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Contracts.Commands.ChangeContractStatus;

public sealed record ChangeContractStatusCommand(int ContractId, ContractAction Action)
    : IRequest<ChangeContractStatusCommandDto>;

public sealed class ChangeContractStatusCommandDto
{
    public required ContractStatus Status { get; init; }
    public required ListingStatus ListingStatus { get; init; }
}

public sealed class ChangeContractStatusCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser, IListingLifecycle lifecycle)
    : IRequestHandler<ChangeContractStatusCommand, ChangeContractStatusCommandDto>
{
    public async Task<ChangeContractStatusCommandDto> Handle(ChangeContractStatusCommand command, CancellationToken ct)
    {
        var contract = await ctx.Contracts
            .Include(c => c.Request).ThenInclude(r => r.Listing)
            .FirstOrDefaultAsync(c => c.Id == command.ContractId && !c.IsDeleted, ct);

        if (contract is null || (contract.SellerOrLandlordId != currentUser.UserId && !currentUser.IsAdmin))
            throw Problems.NotFound("Ugovor nije pronađen.");

        var listingStatus = await lifecycle.ApplyContractAsync(contract, command.Action, ct);
        await ctx.SaveChangesCheckedAsync(ct);

        return new ChangeContractStatusCommandDto { Status = contract.Status, ListingStatus = listingStatus };
    }
}