using RentFlow.Application.Modules.Listings.Common;
using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Commands.ChangeListingStatus
{
    public sealed record ChangeListingStatusCommand(int Id, ListingAction Action)
        : IRequest<ChangeListingStatusCommandDto>;

    public sealed class ChangeListingStatusCommandDto
    {
        public required ListingStatus Status { get; init; }
    }
}
