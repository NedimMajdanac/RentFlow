using FluentValidation.Results;
using RentFlow.Application.Modules.Properties.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.ReorderPropertyImages
{
    public sealed class ReorderPropertyImagesCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<ReorderPropertyImagesCommand>
    {
        public async Task Handle(ReorderPropertyImagesCommand request, CancellationToken ct)
        {
            var property = await ctx.GetEditablePropertyAsync(currentUser, request.PropertyId, ct);

            var images = await ctx.PropertyImages
                .Where(i => i.PropertyId == property.Id && !i.IsDeleted)
                .ToListAsync(ct);

            var sameSet = request.ImageIds.Count == images.Count
                          && request.ImageIds.Distinct().Count() == images.Count
                          && images.All(i => request.ImageIds.Contains(i.Id));

            if (!sameSet)
                throw new ValidationException([new ValidationFailure("imageIds",
                "Lista mora sadržavati sve slike nekretnine, svaku tačno jednom.")]);

            for (var order = 0; order < request.ImageIds.Count; order++)
                images.First(i => i.Id == request.ImageIds[order]).SortOrder = order;

            await ctx.SaveChangesAsync(ct);
        }
    }
}
