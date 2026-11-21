using RentFlow.Domain.Entities.Listing;
using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Listings.Common
{
    public abstract record ListingCommandBase
    {
        public ListingType ListingType { get; init; }
        public string Title { get; init; } = string.Empty;
        public decimal Price { get; init; }           
        public int CurrencyId { get; init; }
        public decimal? Deposit { get; init; }        
        public bool IsNegotiable { get; init; }
    }

    public abstract class ListingCommandValidatorBase<T> : AbstractValidator<T> where T : ListingCommandBase
    {
        private const decimal MaxAmount = 100_000_000m;

        protected ListingCommandValidatorBase(IAppDbContext ctx)
        {
            RuleFor(x => x.ListingType).IsInEnum();
            RuleFor(x => x.Title).NotEmpty().MaximumLength(200);

            RuleFor(x => x.Price)
                .GreaterThan(0).LessThanOrEqualTo(MaxAmount)
                .PrecisionScale(18, 2, false).WithMessage("Najviše dvije decimale.");

            RuleFor(x => x.Deposit)
                .GreaterThanOrEqualTo(0).LessThanOrEqualTo(MaxAmount)
                .PrecisionScale(18, 2, false).WithMessage("Najviše dvije decimale.");

            RuleFor(x => x.CurrencyId)
                .MustAsync((id, ct) => ctx.Currencies.AnyAsync(c => c.Id == id, ct))
                .WithMessage("Odabrana valuta ne postoji.");
        }
    }

    internal static class ListingMapper
    {
        /// <summary>Deposit is only meaningful for rentals, so it's cleared for sales.</summary>
        public static void Apply(ListingEntity e, ListingCommandBase c)
        {
            e.ListingType = c.ListingType;
            e.Title = c.Title.Trim();
            e.Price = c.Price;
            e.CurrencyId = c.CurrencyId;
            e.Deposit = c.ListingType == ListingType.Rent ? c.Deposit : null;
            e.IsNegotiable = c.IsNegotiable;
        }
    }
}
