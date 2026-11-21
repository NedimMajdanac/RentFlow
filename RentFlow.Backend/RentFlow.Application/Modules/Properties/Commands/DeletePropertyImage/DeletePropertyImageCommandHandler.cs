using RentFlow.Application.Modules.Properties.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.DeletePropertyImage
{
    public sealed class DeletePropertyImageCommandHandler(
        IAppDbContext ctx, IAppCurrentUser currentUser, IFileStorage storage)
        : IRequestHandler<DeletePropertyImageCommand>
    {
        public async Task Handle(DeletePropertyImageCommand request, CancellationToken ct)
        {
            var property = await ctx.GetEditablePropertyAsync(currentUser, request.PropertyId, ct);

            var image = await ctx.PropertyImages
                .FirstOrDefaultAsync(i => i.Id == request.ImageId && i.PropertyId == property.Id && !i.IsDeleted, ct)
                ?? throw new NotFoundException("Slika nije pronađena.");

            image.IsDeleted = true;

            if (image.IsMain)
            {
                image.IsMain = false;
                var next = await ctx.PropertyImages
                    .Where(i => i.PropertyId == property.Id && i.Id != image.Id && !i.IsDeleted)
                    .OrderBy(i => i.SortOrder)
                    .FirstOrDefaultAsync(ct);
                if (next is not null) next.IsMain = true;
            }

            await ctx.SaveChangesAsync(ct);
            await storage.DeleteAsync(image.Url, ct);   
        }
    }
}
