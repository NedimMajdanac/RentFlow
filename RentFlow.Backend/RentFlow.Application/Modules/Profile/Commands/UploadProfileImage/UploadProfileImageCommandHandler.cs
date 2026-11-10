using FluentValidation.Results;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Profile.Commands.UploadProfileImage
{
    public sealed class UploadProfileImageCommandHandler(
        IAppDbContext ctx,
        IAppCurrentUser currentUser,
        IFileStorage storage)
        : IRequestHandler<UploadProfileImageCommand, UploadProfileImageCommandDto>
    {
        public async Task<UploadProfileImageCommandDto> Handle(UploadProfileImageCommand request, CancellationToken ct)
        {
            var user = await ctx.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, ct)
                ?? throw new NotFoundException("Korisnik nije pronađen.");

            await using var buffer = new MemoryStream();
            await request.Content.CopyToAsync(buffer, ct);
            buffer.Position = 0;

            // Content-Type sends the file type since the client can send a wrong Content-Type.
            var extension = DetectExtension(buffer)
                ?? throw new ValidationException([new ValidationFailure("file", "Fajl nije ispravna slika.")]);
            buffer.Position = 0;

            var folder = request.Kind == ProfileImageKind.Profile ? "profile-images" : "cover-images";
            var newUrl = await storage.SaveAsync(buffer, folder, extension, ct);

            var oldUrl = request.Kind == ProfileImageKind.Profile ? user.ProfileImageUrl : user.CoverImageUrl;
            if (request.Kind == ProfileImageKind.Profile) user.ProfileImageUrl = newUrl;
            else user.CoverImageUrl = newUrl;

            await ctx.SaveChangesAsync(ct);
            await storage.DeleteAsync(oldUrl, ct);   // delete old image after saving new one, so if deletion fails, the user still has a valid image

            return new UploadProfileImageCommandDto { Url = newUrl };
        }

        private static string? DetectExtension(Stream s)
        {
            Span<byte> h = stackalloc byte[12];
            var read = s.Read(h);
            if (read < 12) return null;

            if (h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF) return ".jpg";
            if (h[0] == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47) return ".png";
            if (h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') return ".webp";
            return null;
        }
    }
}
