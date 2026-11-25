using RentFlow.Application.Modules.Listings.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Commands.UpdateListing
{
    public sealed record UpdateListingCommand : ListingCommandBase, IRequest
    {
        public int Id { get; init; }   
    }
}
