using RentFlow.Application.Modules.Properties.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.CreateProperty
{
    public sealed record CreatePropertyCommand : PropertyCommandBase, IRequest<CreatePropertyCommandDto>;

    public sealed class CreatePropertyCommandDto
    {
        public required int Id { get; init; }
    }
}
