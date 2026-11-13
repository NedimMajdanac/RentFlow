using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Common
{
    public static class ImageFiles
    {
        public const long MaxBytes = 5 * 1024 * 1024;
        public static readonly string[] AllowedTypes = ["image/jpeg", "image/png", "image/webp"];

        /// <summary>Returns ".jpg", ".png" or ".webp" based on the real content (magic bytes), else null.</summary>
        public static string? DetectExtension(Stream s)
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
