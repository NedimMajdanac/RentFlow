using MediatR;
using Microsoft.EntityFrameworkCore;
using RentFlow.Application.Abstractions;
using RentFlow.Application.Common;
using RentFlow.Application.Modules.Requests.Common;
using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Requests.Queries.GetRequestById;

public sealed record GetRequestByIdQuery(int Id) : IRequest<GetRequestByIdQueryDto>;

public sealed class GetRequestByIdQueryDto
{
    public required int Id { get; init; }
    public required RequestStatus Status { get; init; }
    public required string? Message { get; init; }
    public required DateOnly? DesiredStartDate { get; init; }
    public required DateOnly? DesiredEndDate { get; init; }
    public required DateTime CreatedAtUtc { get; init; }
    public required DateTime? RespondedAtUtc { get; init; }

    public required bool IsRequester { get; init; }
    public required bool IsOwner { get; init; }
    public required bool CanCancel { get; init; }      // the requester can withdraw it
    public required bool CanRespond { get; init; }     // the owner can accept or reject it
    public required int? ContractId { get; init; }

    public required RequestListingDto Listing { get; init; }
    public required RequestPartyDto Requester { get; init; }
    public required RequestPartyDto Owner { get; init; }
}