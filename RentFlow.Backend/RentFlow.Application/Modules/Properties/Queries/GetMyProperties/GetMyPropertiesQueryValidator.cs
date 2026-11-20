using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Queries.GetMyProperties
{
    public sealed class GetMyPropertiesQueryValidator : AbstractValidator<GetMyPropertiesQuery>
    {
        public GetMyPropertiesQueryValidator()
        {
            RuleFor(x => x.PageNumber).GreaterThanOrEqualTo(1);
            RuleFor(x => x.PageSize).InclusiveBetween(1, 50);
            RuleFor(x => x.Search).MaximumLength(100);
            RuleFor(x => x.PropertyType).IsInEnum();
            RuleFor(x => x.Status).IsInEnum();
            RuleFor(x => x.ListingType).IsInEnum();
            RuleFor(x => x.Sort).IsInEnum();
        }
    }
}
