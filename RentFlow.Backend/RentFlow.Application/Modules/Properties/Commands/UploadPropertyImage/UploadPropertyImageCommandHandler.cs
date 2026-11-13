using FluentValidation.Results;
using RentFlow.Application.Modules.Properties.Common;
using RentFlow.Domain.Entities.Property;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.UploadPropertyImage
{
    public sealed class UploadPropertyImageCommandHandler(
        IAppDbContext ctx, IAppCurrentUser currentUser, IFileStorage storage)
        : IRequestHandler<UploadPropertyImageCommand, PropertyImageDto>
    {
        private const int MaxImagesPerProperty = 10;

        public async Task<PropertyImageDto> Handle(UploadPropertyImageCommand request, CancellationToken ct)
        {
            var property = await ctx.GetEditablePropertyAsync(currentUser, request.PropertyId, ct);

            var existing = await ctx.PropertyImages
                .Where(i => i.PropertyId == property.Id && !i.IsDeleted)
                .Select(i => i.SortOrder)
                .ToListAsync(ct);

            if (existing.Count >= MaxImagesPerProperty)
                throw new ValidationException([new ValidationFailure("file",
                $"Nekretnina može imati najviše {MaxImagesPerProperty} slika.")]);

            // Max 5 MB is already validated by FluentValidation, but we still need to read the stream to check the content type.
            await using var buffer = new MemoryStream();
            await request.Content.CopyToAsync(buffer, ct);
            buffer.Position = 0;

            var extension = ImageFiles.DetectExtension(buffer)
                ?? throw new ValidationException([new ValidationFailure("file", "Fajl nije ispravna slika.")]);
            buffer.Position = 0;

            var url = await storage.SaveAsync(buffer, "property-images", extension, ct);

            var image = new PropertyImageEntity
            {
                PropertyId = property.Id,
                Url = url,
                IsMain = existing.Count == 0,                       // first image is the main one
                SortOrder = existing.Count == 0 ? 0 : existing.Max() + 1
            };
            ctx.PropertyImages.Add(image);

            try
            {
                await ctx.SaveChangesAsync(ct);
            }
            catch
            {
                await storage.DeleteAsync(url, CancellationToken.None);  
                throw;
            }

            return new PropertyImageDto { Id = image.Id, Url = image.Url, IsMain = image.IsMain, SortOrder = image.SortOrder };
        }
    }
}
