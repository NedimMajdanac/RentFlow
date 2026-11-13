using RentFlow.Application.Modules.Properties.Common;
using RentFlow.Domain.Entities.Property;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Properties.Commands.CreateProperty
{
    public sealed class CreatePropertyCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<CreatePropertyCommand, CreatePropertyCommandDto>
    {
        public async Task<CreatePropertyCommandDto> Handle(CreatePropertyCommand request, CancellationToken ct)
        {
            if (currentUser.UserId is not int userId)
                throw new UnauthorizedAccessException("A signed-in user is required to create a property.");

            var property = new PropertyEntity { OwnerId = userId };
            PropertyMapper.Apply(property, request);

            foreach (var amenityId in request.AmenityIds)
                property.Amenities.Add(new PropertyAmenityEntity { AmenityId = amenityId });

            ctx.Properties.Add(property);
            await ctx.SaveChangesAsync(ct);

            return new CreatePropertyCommandDto { Id = property.Id };
        }
    }
}
