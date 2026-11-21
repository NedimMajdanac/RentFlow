using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.DeleteProperty
{
    public sealed record DeletePropertyCommand(int Id) : IRequest;
}
