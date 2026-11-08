using Microsoft.EntityFrameworkCore.Infrastructure;
using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Profile.Commands.UpdateMyProfile
{
    public sealed class UpdateMyProfileCommandHandler(IAppDbContext ctx, IAppCurrentUser currentUser)
        : IRequestHandler<UpdateMyProfileCommand, UpdateMyProfileCommandDto>
    {
        public async Task<UpdateMyProfileCommandDto> Handle(UpdateMyProfileCommand request, CancellationToken ct)
        {
            var user = await ctx.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, ct)
                ?? throw new NotFoundException("Korisnik nije pronađen.");

            user.Firstname = request.Firstname.Trim();
            user.Lastname = request.Lastname.Trim();
            user.Phone = request.Phone.TrimToNull();
            user.Address = request.Address.TrimToNull();
            user.City = request.City.TrimToNull();
            user.ProfileDescription = request.ProfileDescription.TrimToNull();

            user.UpdateVerification();

            await ctx.SaveChangesAsync(ct);

            return new UpdateMyProfileCommandDto { IsVerified = user.IsVerified };
        }
    }
}
