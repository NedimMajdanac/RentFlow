using RentFlow.Application.Modules.Listings.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Commands.CreateListing
{
    public sealed class CreateListingCommandValidator : ListingCommandValidatorBase<CreateListingCommand>
    {
        public CreateListingCommandValidator(IAppDbContext ctx) : base(ctx)
        {
            RuleFor(x => x.PropertyId).GreaterThan(0);
        }
    }
}
