using FluentValidation;
using MediatR;
using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Requests.Commands.CreateRequest;

public sealed record CreateRequestCommand : IRequest<CreateRequestCommandDto>
{
    public int ListingId { get; init; }
    public string? Message { get; init; }
    public DateOnly? DesiredStartDate { get; init; }   // rent only
    public DateOnly? DesiredEndDate { get; init; }     // rent only
}

public sealed class CreateRequestCommandDto
{
    public required int Id { get; init; }
    public required RequestStatus Status { get; init; }
    public required ListingType ListingType { get; init; }
    public required DateTime CreatedAtUtc { get; init; }
}

public sealed class CreateRequestCommandValidator : AbstractValidator<CreateRequestCommand>
{
    public CreateRequestCommandValidator()
    {
        RuleFor(x => x.ListingId).GreaterThan(0);
        RuleFor(x => x.Message).MaximumLength(2000);
    }
}