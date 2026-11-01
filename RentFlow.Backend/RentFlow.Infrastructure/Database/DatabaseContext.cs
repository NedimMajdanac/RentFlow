
using RentFlow.Application.Abstractions;
using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Deals;
using RentFlow.Domain.Entities.Finance;
using RentFlow.Domain.Entities.Identity;
using RentFlow.Domain.Entities.Listing;
using RentFlow.Domain.Entities.Property;

namespace RentFlow.Infrastructure.Database;

public partial class DatabaseContext : DbContext, IAppDbContext
{
    public DbSet<UserEntity> Users => Set<UserEntity>();
    public DbSet<CityEntity> Cities => Set<CityEntity>();
    public DbSet<PropertyEntity> Properties => Set<PropertyEntity>();
    public DbSet<PropertyImageEntity> PropertyImages => Set<PropertyImageEntity>();
    public DbSet<AmenityEntity> Amenities => Set<AmenityEntity>();
    public DbSet<PropertyAmenityEntity> PropertyAmenities => Set<PropertyAmenityEntity>();
    public DbSet<ListingEntity> Listings => Set<ListingEntity>();
    public DbSet<FavoriteEntity> Favorites => Set<FavoriteEntity>();
    public DbSet<RequestEntity> Requests => Set<RequestEntity>();
    public DbSet<ContractEntity> Contracts => Set<ContractEntity>();
    public DbSet<RentInstallmentEntity> RentInstallments => Set<RentInstallmentEntity>();
    public DbSet<TransactionEntity> Transactions => Set<TransactionEntity>();
    public DbSet<RefundEntity> Refunds => Set<RefundEntity>();
    public DbSet<RefreshTokenEntity> RefreshTokens => Set<RefreshTokenEntity>();
    public DbSet<PasswordResetTokenEntity> PasswordResetTokens => Set<PasswordResetTokenEntity>();

    public DbSet<CurrencyEntity> Currencies => Set<CurrencyEntity>();
    public DbSet<ExchangeRateEntity> ExchangeRates => Set<ExchangeRateEntity>();
    private readonly TimeProvider _clock;
    public DatabaseContext(DbContextOptions<DatabaseContext> options, TimeProvider clock) : base(options)
    {
        _clock = clock;
    }
}
