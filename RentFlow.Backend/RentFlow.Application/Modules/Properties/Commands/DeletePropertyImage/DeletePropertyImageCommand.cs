using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.DeletePropertyImage
{
    public sealed record DeletePropertyImageCommand(int PropertyId, int ImageId) : IRequest;
}
