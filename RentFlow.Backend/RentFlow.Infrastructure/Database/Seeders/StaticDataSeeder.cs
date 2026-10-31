using Microsoft.EntityFrameworkCore;
using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Finance;
using RentFlow.Domain.Entities.Property;

namespace RentFlow.Infrastructure.Database.Seeders;

/// <summary>
/// Static (reference) data needed by every environment. Written into the migration via HasData,
/// so it uses fixed Ids and a fixed date (never DateTime.UtcNow).
/// Demo data belongs in <see cref="DynamicDataSeeder"/>.
/// Currencies and the initial EUR exchange rate are seeded here because runtime demo seeding depends on them.
/// </summary>
public static class StaticDataSeeder
{
    private static readonly DateTime SeedDate = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    /// <summary>Fiksni Id-evi gradova, koriste ih i dynamic seeder.</summary>
    public static class CityIds
    {
        public const int Sarajevo = 1, BanjaLuka = 2, Tuzla = 3, Zenica = 4, Mostar = 5,
                         Travnik = 6, Bihac = 7, Brcko = 8, Trebinje = 9, Doboj = 10,
                         Bijeljina = 11, Prijedor = 12, Cazin = 13, Konjic = 14, Jajce = 15;
    }

    public static void Seed(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CityEntity>().HasData(
            City(CityIds.Sarajevo,  "Sarajevo",  "71000", "Kanton Sarajevo"),
            City(CityIds.BanjaLuka, "Banja Luka","78000", "Republika Srpska"),
            City(CityIds.Tuzla,     "Tuzla",     "75000", "Tuzlanski kanton"),
            City(CityIds.Zenica,    "Zenica",    "72000", "Zeničko-dobojski kanton"),
            City(CityIds.Mostar,    "Mostar",    "88000", "Hercegovačko-neretvanski kanton"),
            City(CityIds.Travnik,   "Travnik",   "72270", "Srednjobosanski kanton"),
            City(CityIds.Bihac,     "Bihać",     "77000", "Unsko-sanski kanton"),
            City(CityIds.Brcko,     "Brčko",     "76100", "Brčko distrikt"),
            City(CityIds.Trebinje,  "Trebinje",  "89101", "Republika Srpska"),
            City(CityIds.Doboj,     "Doboj",     "74000", "Republika Srpska"),
            City(CityIds.Bijeljina, "Bijeljina", "76300", "Republika Srpska"),
            City(CityIds.Prijedor,  "Prijedor",  "79101", "Republika Srpska"),
            City(CityIds.Cazin,     "Cazin",     "77220", "Unsko-sanski kanton"),
            City(CityIds.Konjic,    "Konjic",    "88400", "Hercegovačko-neretvanski kanton"),
            City(CityIds.Jajce,     "Jajce",     "70101", "Srednjobosanski kanton"));

        var amenities = new[]
        {
            "Parking", "Garaža", "Balkon", "Terasa", "Lift", "Podrum", "Klima",
            "Internet", "Interfon", "Vrt", "Kablovska TV", "Ostava", "Alarm",
            "Kućni ljubimci dozvoljeni"
        };

        modelBuilder.Entity<AmenityEntity>().HasData(
            amenities.Select((name, i) => new AmenityEntity
            {
                Id = i + 1,
                Name = name,
                IsDeleted = false,
                CreatedAtUtc = SeedDate
            }));

        modelBuilder.Entity<CurrencyEntity>().HasData(
            new CurrencyEntity
            {
                Id = 1,
                Code = "BAM",
                Name = "Konvertibilna marka",
                Symbol = "KM",
                DecimalPlaces = 2,
                IsBase = true,
                IsEnabled = true,
                IsDeleted = false,
                CreatedAtUtc = SeedDate
            },
            new CurrencyEntity
            {
                Id = 2,
                Code = "EUR",
                Name = "Euro",
                Symbol = "€",
                DecimalPlaces = 2,
                IsBase = false,
                IsEnabled = true,
                IsDeleted = false,
                CreatedAtUtc = SeedDate
            });

        modelBuilder.Entity<ExchangeRateEntity>().HasData(new ExchangeRateEntity
        {
            Id = 1,
            CurrencyId = 2,
            RateToBase = ExchangeRateEntity.EurRateToBam,
            ValidFromUtc = SeedDate,
            Source = "Seed data",
            IsDeleted = false,
            CreatedAtUtc = SeedDate
        });
    }

    private static CityEntity City(int id, string name, string postalCode, string region) => new()
    {
        Id = id,
        Name = name,
        PostalCode = postalCode,
        Region = region,
        IsDeleted = false,
        CreatedAtUtc = SeedDate
    };
}
