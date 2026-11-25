using FluentValidation.Results;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Common
{
    public static class Problems
    {
        public static ValidationException Invalid(string field, string message)
            => new([new ValidationFailure(field, message)]);

        public static NotFoundException NotFound(string message) => new(message);
    }
}
