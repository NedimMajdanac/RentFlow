using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Common
{
    public abstract class PropertyCommandValidatorBase<T> : AbstractValidator<T> where T : PropertyCommandBase
    {
        protected PropertyCommandValidatorBase(IAppDbContext ctx)
        {
            RuleFor(x => x.CityId)
                .MustAsync((id, ct) => ctx.Cities.AnyAsync(c => c.Id == id, ct))
                .WithMessage("Odabrani grad ne postoji.");

            RuleFor(x => x.PropertyType).IsInEnum();
            RuleFor(x => x.Address).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Description).MaximumLength(4000);

            RuleFor(x => x.AreaM2).GreaterThan(0).LessThanOrEqualTo(100_000);
            RuleFor(x => x.PlotAreaM2).GreaterThan(0).LessThanOrEqualTo(10_000_000);
            RuleFor(x => x.Rooms).InclusiveBetween(0, 50);
            RuleFor(x => x.Bathrooms).InclusiveBetween(0, 20);
            RuleFor(x => x.Floor).InclusiveBetween(-5, 100);
            RuleFor(x => x.TotalFloors).InclusiveBetween(0, 100);
            RuleFor(x => x.YearBuilt).InclusiveBetween(1800, DateTime.UtcNow.Year + 5);

            RuleFor(x => x.Floor)
                .Must((x, floor) => floor!.Value <= x.TotalFloors!.Value)
                .When(x => x.Floor.HasValue && x.TotalFloors.HasValue)
                .WithMessage("Sprat ne može biti veći od ukupnog broja spratova.");

            RuleFor(x => x.HeatingType).IsInEnum();
            RuleFor(x => x.FurnishedStatus).IsInEnum();
            RuleFor(x => x.Condition).IsInEnum();

            RuleFor(x => x.Latitude).InclusiveBetween(-90m, 90m);
            RuleFor(x => x.Longitude).InclusiveBetween(-180m, 180m);
            RuleFor(x => x.Longitude)
                .Must((x, lon) => x.Latitude.HasValue == lon.HasValue)
                .WithMessage("Unesite i geografsku širinu i dužinu.");

            RuleFor(x => x.AmenityIds).Cascade(CascadeMode.Stop)
                .NotNull()
                .Must(ids => ids.Count <= 30).WithMessage("Najviše 30 pogodnosti.")
                .Must(ids => ids.Distinct().Count() == ids.Count).WithMessage("Pogodnosti se ponavljaju.")
                .MustAsync(async (ids, ct) =>
                    ids.Count == 0 || await ctx.Amenities.CountAsync(a => ids.Contains(a.Id), ct) == ids.Count)
                .WithMessage("Neka od odabranih pogodnosti ne postoji.");
        }
    }
}
