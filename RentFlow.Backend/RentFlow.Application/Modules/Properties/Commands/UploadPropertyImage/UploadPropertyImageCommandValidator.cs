using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.UploadPropertyImage
{
    public sealed class UploadPropertyImageCommandValidator : AbstractValidator<UploadPropertyImageCommand>
    {
        public UploadPropertyImageCommandValidator()
        {
            RuleFor(x => x.Length)
                .GreaterThan(0).WithMessage("Fajl je prazan.")
                .LessThanOrEqualTo(ImageFiles.MaxBytes).WithMessage("Slika može imati najviše 5 MB.");

            RuleFor(x => x.ContentType)
                .Must(t => ImageFiles.AllowedTypes.Contains(t, StringComparer.OrdinalIgnoreCase))
                .WithMessage("Dozvoljeni formati su JPG, PNG i WebP.");
        }
    }
}
