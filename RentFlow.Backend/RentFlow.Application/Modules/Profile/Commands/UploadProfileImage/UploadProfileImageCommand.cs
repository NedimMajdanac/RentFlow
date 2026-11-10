using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Profile.Commands.UploadProfileImage
{
    public enum ProfileImageKind { Profile, Cover }

    public sealed class UploadProfileImageCommand : IRequest<UploadProfileImageCommandDto>
    {
        public required Stream Content { get; init; }
        public required string ContentType { get; init; }
        public required long Length { get; init; }
        public required ProfileImageKind Kind { get; init; }
    }

    public sealed class UploadProfileImageCommandDto
    {
        public required string Url { get; init; }
    }
}
