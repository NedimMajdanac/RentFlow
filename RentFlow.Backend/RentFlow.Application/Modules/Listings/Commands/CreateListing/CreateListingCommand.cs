using RentFlow.Application.Modules.Listings.Common;
using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Commands.CreateListing
{
    public sealed record CreateListingCommand : ListingCommandBase, IRequest<CreateListingCommandDto>
    {
        public int PropertyId { get; init; }
        public bool Publish { get; init; }   
    }

    public sealed class CreateListingCommandDto
    {
        public required int Id { get; init; }
        public required ListingStatus Status { get; init; }
    }
}
