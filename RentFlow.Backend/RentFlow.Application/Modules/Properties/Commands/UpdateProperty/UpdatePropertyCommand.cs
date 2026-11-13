using RentFlow.Application.Modules.Properties.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.UpdateProperty
{
    public sealed record UpdatePropertyCommand : PropertyCommandBase, IRequest
    {
        public int Id { get; init; }   
    }
}
