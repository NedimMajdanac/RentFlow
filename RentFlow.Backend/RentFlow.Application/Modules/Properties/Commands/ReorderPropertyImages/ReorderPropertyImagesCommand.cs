using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.ReorderPropertyImages
{
    public sealed record ReorderPropertyImagesCommand : IRequest
    {
        public int PropertyId { get; init; }                 
        public List<int> ImageIds { get; init; } = new();   
    }
}
