using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.SetMainPropertyImage
{
    public sealed record SetMainPropertyImageCommand(int PropertyId, int ImageId) : IRequest;
}
