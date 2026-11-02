using FluentValidation;
using Microsoft.EntityFrameworkCore;
using RentFlow.Application.Abstractions;
using RentFlow.Application.Common;
using RentFlow.Domain.Entities.Identity;

namespace RentFlow.Application.Modules.Auth.Commands.Register;

public sealed class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator(IAppDbContext ctx)
    {
        RuleFor(x => x.Firstname)
            .NotEmpty().WithMessage("Ime je obavezno.")
            .MaximumLength(UserEntity.Constraints.FirstnameMaxLength)
            .WithMessage($"Ime može imati najviše {UserEntity.Constraints.FirstnameMaxLength} znakova.");

        RuleFor(x => x.Lastname)
            .NotEmpty().WithMessage("Prezime je obavezno.")
            .MaximumLength(UserEntity.Constraints.LastnameMaxLength)
            .WithMessage($"Prezime može imati najviše {UserEntity.Constraints.LastnameMaxLength} znakova.");

        // Cascade.Stop: the database check runs only for a valid email.
        RuleFor(x => x.Email)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Email je obavezan.")
            .MaximumLength(UserEntity.Constraints.EmailMaxLength)
            .WithMessage($"Email može imati najviše {UserEntity.Constraints.EmailMaxLength} znakova.")
            .EmailAddress().WithMessage("Email nije ispravan.")
            .MustAsync(async (email, ct) =>
            {
                // Case-insensitive, like login; soft-deleted users are skipped by the global query filter
                // (the unique index on Email also ignores them).
                var normalized = email.Trim().ToLower();
                return !await ctx.Users.AnyAsync(u => u.Email.ToLower() == normalized, ct);
            })
            .WithMessage("Email je već registrovan.");

        RuleFor(x => x.Password)
            .ValidPassword();

        RuleFor(x => x.Address)
            .MaximumLength(UserEntity.Constraints.AddressMaxLength)
            .WithMessage($"Adresa može imati najviše {UserEntity.Constraints.AddressMaxLength} znakova.");

        RuleFor(x => x.City)
            .MaximumLength(UserEntity.Constraints.CityMaxLength)
            .WithMessage($"Grad može imati najviše {UserEntity.Constraints.CityMaxLength} znakova.");

        RuleFor(x => x.Phone).MaximumLength(UserEntity.Constraints.PhoneMaxLength);
    }
}
