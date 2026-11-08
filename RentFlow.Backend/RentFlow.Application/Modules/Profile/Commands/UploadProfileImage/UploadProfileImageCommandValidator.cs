using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Profile.Commands.UploadProfileImage
{
    public sealed class UploadProfileImageCommandValidator : AbstractValidator<UploadProfileImageCommand>
    {
        public const long MaxBytes = 5 * 1024 * 1024;
        public static readonly string[] AllowedTypes = ["image/jpeg", "image/png", "image/webp"];

        public UploadProfileImageCommandValidator()
        {
            RuleFor(x => x.Length)
                .GreaterThan(0).WithMessage("Fajl je prazan.")
                .LessThanOrEqualTo(MaxBytes).WithMessage("Slika može imati najviše 5 MB.");

            RuleFor(x => x.ContentType)
                .Must(t => AllowedTypes.Contains(t, StringComparer.OrdinalIgnoreCase))
                .WithMessage("Dozvoljeni formati su JPG, PNG i WebP.");
        }
    }
}
