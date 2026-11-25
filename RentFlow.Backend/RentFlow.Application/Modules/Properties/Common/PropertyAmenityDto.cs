using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Common
{
    public sealed class PropertyAmenityDto
    {
        public required int Id { get; init; }
        public required string Name { get; init; }
    }
}
