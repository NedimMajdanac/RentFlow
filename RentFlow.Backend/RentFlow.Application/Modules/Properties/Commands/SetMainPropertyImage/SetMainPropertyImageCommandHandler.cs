using RentFlow.Application.Modules.Properties.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.SetMainPropertyImage
{
    public sealed class SetMainPropertyImageCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<SetMainPropertyImageCommand>
    {
        public async Task Handle(SetMainPropertyImageCommand request, CancellationToken ct)
        {
            var property = await ctx.GetEditablePropertyAsync(currentUser, request.PropertyId, ct);

            var images = await ctx.PropertyImages
                .Where(i => i.PropertyId == property.Id && !i.IsDeleted)
                .ToListAsync(ct);

            if (!images.Any(i => i.Id == request.ImageId))
                throw new NotFoundException("Slika nije pronađena.");

            foreach (var image in images) image.IsMain = image.Id == request.ImageId;

            await ctx.SaveChangesAsync(ct);
        }
    }
}
