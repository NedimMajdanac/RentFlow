using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Modules.Profile.Commands.UpdateMyProfile
{
    public sealed class UpdateMyProfileCommandValidator : AbstractValidator<UpdateMyProfileCommand>
    {
        public UpdateMyProfileCommandValidator()
        {
            RuleFor(x => x.Firstname).NotEmpty().MaximumLength(UserEntity.Constraints.FirstnameMaxLength);
            RuleFor(x => x.Lastname).NotEmpty().MaximumLength(UserEntity.Constraints.LastnameMaxLength);

            RuleFor(x => x.Phone)
                .MaximumLength(UserEntity.Constraints.PhoneMaxLength)
                .Matches(@"^\+?[0-9\s\-/()]{6,}$")
                .When(x => !string.IsNullOrWhiteSpace(x.Phone))
                .WithMessage("Unesite ispravan broj telefona.");

            RuleFor(x => x.Address).MaximumLength(UserEntity.Constraints.AddressMaxLength);
            RuleFor(x => x.City).MaximumLength(UserEntity.Constraints.CityMaxLength);
            RuleFor(x => x.ProfileDescription).MaximumLength(UserEntity.Constraints.ProfileDescriptionMaxLength);
        }
    }
}
