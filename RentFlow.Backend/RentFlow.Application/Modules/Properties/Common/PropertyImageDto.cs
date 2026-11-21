using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Common
{
    public sealed class PropertyImageDto
    {
        public required int Id { get; init; }
        public required string Url { get; init; }
        public required bool IsMain { get; init; }
        public required int SortOrder { get; init; }
    }
}
