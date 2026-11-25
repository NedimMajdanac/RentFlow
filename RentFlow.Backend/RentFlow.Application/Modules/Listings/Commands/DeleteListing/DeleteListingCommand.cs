using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Commands.DeleteListing
{
    public sealed record DeleteListingCommand(int Id) : IRequest;
}
