using Microsoft.EntityFrameworkCore;
using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Deals;
using RentFlow.Domain.Entities.Finance;
using RentFlow.Domain.Entities.Identity;
using RentFlow.Domain.Entities.Listing;
using RentFlow.Domain.Entities.Property;

namespace RentFlow.Application.Abstractions;

// Application layer
public interface IAppDbContext
{
    DbSet<UserEntity> Users { get; }
    DbSet<CityEntity> Cities { get; }
    DbSet<PropertyEntity> Properties { get; }
    DbSet<PropertyImageEntity> PropertyImages { get; }
    DbSet<AmenityEntity> Amenities { get; }
    DbSet<PropertyAmenityEntity> PropertyAmenities { get; }
    DbSet<ListingEntity> Listings { get; }
    DbSet<FavoriteEntity> Favorites { get; }
    DbSet<RequestEntity> Requests { get; }
    DbSet<ContractEntity> Contracts { get; }
    DbSet<RentInstallmentEntity> RentInstallments { get; }
    DbSet<TransactionEntity> Transactions { get; }
    DbSet<RefundEntity> Refunds { get; }
    DbSet<RefreshTokenEntity> RefreshTokens { get; }
    DbSet<PasswordResetTokenEntity> PasswordResetTokens { get; }

    DbSet<CurrencyEntity> Currencies { get; }
    DbSet<ExchangeRateEntity> ExchangeRates { get; }

    Task<int> SaveChangesAsync(CancellationToken ct);
}
