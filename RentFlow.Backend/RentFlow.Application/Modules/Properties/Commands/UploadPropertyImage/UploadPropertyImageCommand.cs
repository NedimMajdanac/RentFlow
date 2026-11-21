using RentFlow.Application.Modules.Properties.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.UploadPropertyImage
{
    public sealed class UploadPropertyImageCommand : IRequest<PropertyImageDto>
    {
        public required int PropertyId { get; init; }
        public required Stream Content { get; init; }
        public required string ContentType { get; init; }
        public required long Length { get; init; }
    }
}
