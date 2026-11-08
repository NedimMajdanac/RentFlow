using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Profile.Commands.UpdateMyProfile
{
    public sealed class UpdateMyProfileCommand : IRequest<UpdateMyProfileCommandDto>
    {
        public string Firstname { get; init; } = string.Empty;
        public string Lastname { get; init; } = string.Empty;
        public string? Phone { get; init; }
        public string? Address { get; init; }
        public string? City { get; init; }
        public string? ProfileDescription { get; init; }
    }

    public sealed class UpdateMyProfileCommandDto
    {
        public required bool IsVerified { get; init; }
    }
}
