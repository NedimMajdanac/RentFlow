using FluentValidation;
using MediatR;
using RentFlow.Application.Common;
using RentFlow.Application.Modules.Requests.Common;
using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Requests.Queries.GetMyRequests;

public sealed class GetMyRequestsQuery : IRequest<PageResult<GetMyRequestsQueryDto>>
{
    public RequestStatus? Status { get; init; }
    public ListingType? ListingType { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 10;
}

public sealed class GetMyRequestsQueryValidator : AbstractValidator<GetMyRequestsQuery>
{
    public GetMyRequestsQueryValidator()
    {
        RuleFor(x => x.PageNumber).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 50);
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.ListingType).IsInEnum();
    }
}

public sealed class GetMyRequestsQueryDto
{
    public required int Id { get; init; }
    public required RequestStatus Status { get; init; }
    public required string? Message { get; init; }
    public required DateOnly? DesiredStartDate { get; init; }
    public required DateOnly? DesiredEndDate { get; init; }
    public required DateTime CreatedAtUtc { get; init; }      // submission date
    public required DateTime? RespondedAtUtc { get; init; }
    public required bool CanCancel { get; init; }
    public required int? ContractId { get; init; }            // set once a contract exists for the request
    public required string OwnerName { get; init; }
    public required RequestListingDto Listing { get; init; }
}