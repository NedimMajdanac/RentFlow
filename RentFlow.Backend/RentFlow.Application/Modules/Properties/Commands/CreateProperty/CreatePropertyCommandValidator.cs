using RentFlow.Application.Modules.Properties.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.CreateProperty
{
    public sealed class CreatePropertyCommandValidator(IAppDbContext ctx)
    : PropertyCommandValidatorBase<CreatePropertyCommand>(ctx);
}
