using RentFlow.Application.Modules.Properties.Common;
using RentFlow.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.DeleteProperty
{
    public sealed class DeletePropertyCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<DeletePropertyCommand>
    {
        public async Task Handle(DeletePropertyCommand request, CancellationToken ct)
        {
            var property = await ctx.GetEditablePropertyAsync(currentUser, request.Id, ct);

            var listings = await ctx.Listings.Where(l => l.PropertyId == property.Id && !l.IsDeleted).ToListAsync(ct);

            var blocked = listings.Any(l => l.Status is ListingStatus.Active or ListingStatus.Reserved or ListingStatus.Rented);
            if (blocked)
                throw new ConflictException(
                "Nekretnina ima aktivan, rezervisan ili iznajmljen oglas. Prvo zatvorite oglas.");

            // a sold property and a property with a contract in progress keep their history
            if (listings.Any(l => l.Status == ListingStatus.Sold) || await ctx.LiveContracts(property.Id).AnyAsync(ct))
                throw Problems.Invalid("property", "Nekretnina je prodana ili ima ugovor u toku i ne može se obrisati.");

            foreach (var draft in listings.Where(l => l.Status == ListingStatus.Draft))
                draft.IsDeleted = true;

            var images = await ctx.PropertyImages.Where(i => i.PropertyId == property.Id && !i.IsDeleted).ToListAsync(ct);
            foreach (var image in images) image.IsDeleted = true;

            var links = await ctx.PropertyAmenities.Where(pa => pa.PropertyId == property.Id && !pa.IsDeleted).ToListAsync(ct);
            foreach (var link in links) link.IsDeleted = true;

            property.IsDeleted = true;
            await ctx.SaveChangesAsync(ct);
        }
    }
}
