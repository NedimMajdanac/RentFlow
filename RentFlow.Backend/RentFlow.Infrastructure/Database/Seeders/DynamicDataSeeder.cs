using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RentFlow.Domain.Entities;
using RentFlow.Domain.Entities.Deals;
using RentFlow.Domain.Entities.Finance;
using RentFlow.Domain.Entities.Identity;
using RentFlow.Domain.Entities.Listing;
using RentFlow.Domain.Entities.Property;
using RentFlow.Domain.Enums;
using static RentFlow.Infrastructure.Database.Seeders.StaticDataSeeder;

namespace RentFlow.Infrastructure.Database.Seeders;

/// <summary>
/// Dynamic seeder koji se pokreće u runtime-u, obično pri startu aplikacije (Program.cs).
/// Unosi demo/test podatke koji nisu dio migracije. Idempotentan: ako nekretnine već postoje, ne radi ništa.
/// Pretpostavlja da je migracija primijenjena (gradovi, pogodnosti, valute i kursevi već postoje).
/// </summary>
public sealed class DynamicDataSeeder(DatabaseContext db, IPasswordHasher<UserEntity> passwordHasher)
{
    private const decimal EurToBam = 1.95583m;   // fiksni kurs KM prema EUR (currency board)

    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (await db.Properties.AnyAsync(ct)) return;

        // ---------- currency and exchange rates ----------
        var bam = await db.Currencies.FirstAsync(c => c.Code == "BAM", ct);
        var eur = await db.Currencies.FirstAsync(c => c.Code == "EUR", ct);
        var eurRate = await db.ExchangeRates
            .Where(r => r.CurrencyId == eur.Id)
            .OrderByDescending(r => r.ValidFromUtc)
            .FirstOrDefaultAsync(ct);

        // ---------- users ----------
        var owner1  = await GetOrCreateUserAsync("vlasnik1@rentflow.ba", "Amir", "Hadžić", ct);
        var owner2  = await GetOrCreateUserAsync("vlasnik2@rentflow.ba", "Lejla", "Kovačević", ct);
        var tenant1 = await GetOrCreateUserAsync("korisnik1@rentflow.ba", "Emir", "Begić", ct);
        var tenant2 = await GetOrCreateUserAsync("korisnik2@rentflow.ba", "Ivana", "Marić", ct);

        var amenities = await db.Amenities.ToDictionaryAsync(a => a.Name, ct);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // ---------- properties ----------
        var p1 = new PropertyEntity
        {
            Owner = owner1, CityId = CityIds.Sarajevo, PropertyType = PropertyType.Apartment,
            Address = "Zmaja od Bosne 12", Description = "Dvosoban stan u centru, blizu tramvaja.",
            AreaM2 = 58, Rooms = 2, Bathrooms = 1, Floor = 3, TotalFloors = 6, YearBuilt = 2015,
            HeatingType = HeatingType.Central, FurnishedStatus = FurnishedStatus.Furnished,
            Condition = PropertyCondition.Renovated, Latitude = 43.8563m, Longitude = 18.4131m
        };
        var p2 = new PropertyEntity
        {
            Owner = owner2, CityId = CityIds.Travnik, PropertyType = PropertyType.House,
            Address = "Ive Andrića 5", Description = "Porodična kuća s dvorištem i garažom.",
            AreaM2 = 160, PlotAreaM2 = 520, Rooms = 5, Bathrooms = 2, Floor = 0, TotalFloors = 2, YearBuilt = 2008,
            HeatingType = HeatingType.Gas, FurnishedStatus = FurnishedStatus.Unfurnished,
            Condition = PropertyCondition.Good, Latitude = 44.2264m, Longitude = 17.6658m
        };
        var p3 = new PropertyEntity
        {
            Owner = owner1, CityId = CityIds.BanjaLuka, PropertyType = PropertyType.Commercial,
            Address = "Bulevar vojvode Stepe Stepanovića 20", Description = "Poslovni prostor u prizemlju, izlog na glavnu ulicu.",
            AreaM2 = 85, Rooms = 3, Bathrooms = 1, Floor = 0, TotalFloors = 4, YearBuilt = 2012,
            HeatingType = HeatingType.Electric, FurnishedStatus = FurnishedStatus.Unfurnished,
            Condition = PropertyCondition.Good
        };
        var p4 = new PropertyEntity
        {
            Owner = owner2, CityId = CityIds.Mostar, PropertyType = PropertyType.Land,
            Address = "Blagaj bb", Description = "Građevinsko zemljište, ravno, sa pristupom putu.",
            AreaM2 = 800, PlotAreaM2 = 800
        };
        var p5 = new PropertyEntity
        {
            Owner = owner2, CityId = CityIds.Zenica, PropertyType = PropertyType.Apartment,
            Address = "Fra Ivana Jukića 8", Description = "Jednosoban stan, potrebna manja adaptacija.",
            AreaM2 = 47, Rooms = 2, Bathrooms = 1, Floor = 1, TotalFloors = 5, YearBuilt = 1998,
            HeatingType = HeatingType.Central, FurnishedStatus = FurnishedStatus.Partly,
            Condition = PropertyCondition.NeedsRenovation
        };
        var p6 = new PropertyEntity
        {
            Owner = owner1, CityId = CityIds.Tuzla, PropertyType = PropertyType.Garage,
            Address = "Slatina 14", Description = "Zasebna garaža s električnim rolo vratima.",
            AreaM2 = 18, HeatingType = HeatingType.None, Condition = PropertyCondition.Good
        };
        var props = new[] { p1, p2, p3, p4, p5, p6 };

        // images
        for (var i = 0; i < props.Length; i++)
        {
            var count = i < 2 ? 2 : 1;
            for (var j = 0; j < count; j++)
                props[i].Images.Add(new PropertyImageEntity
                {
                    Url = $"/uploads/seed/property-{i + 1}-{j + 1}.jpg",
                    IsMain = j == 0,
                    SortOrder = j
                });
        }

        // amenities
        void AddAmenities(PropertyEntity p, params string[] names)
        {
            foreach (var n in names)
                p.Amenities.Add(new PropertyAmenityEntity { Amenity = amenities[n] });
        }
        AddAmenities(p1, "Balkon", "Lift", "Klima", "Internet", "Interfon", "Kablovska TV");
        AddAmenities(p2, "Parking", "Garaža", "Terasa", "Vrt", "Podrum", "Internet");
        AddAmenities(p3, "Klima", "Internet", "Alarm", "Parking");
        AddAmenities(p5, "Balkon", "Internet", "Interfon");
        AddAmenities(p6, "Alarm");

        // ---------- listings ----------
        ListingEntity NewListing(PropertyEntity p, ListingType type, string title, decimal price,
            CurrencyEntity cur, ListingStatus status, decimal? deposit = null, bool negotiable = false) => new()
        {
            Property = p, ListingType = type, Title = title, Price = price, Currency = cur,
            Deposit = deposit, IsNegotiable = negotiable, Status = status,
            PublishedAtUtc = status == ListingStatus.Draft ? null : DateTime.UtcNow.AddDays(-60)
        };

        var l1 = NewListing(p1, ListingType.Rent, "Namješten dvosoban stan u centru Sarajeva", 900, bam, ListingStatus.Rented, 900);
        var l2 = NewListing(p2, ListingType.Sale, "Kuća s dvorištem, Travnik", 185000, eur, ListingStatus.Active, negotiable: true);
        var l3 = NewListing(p3, ListingType.Rent, "Poslovni prostor, Banja Luka", 1500, eur, ListingStatus.Active, 1500);
        var l4 = NewListing(p4, ListingType.Sale, "Građevinsko zemljište, Blagaj", 45000, bam, ListingStatus.Sold);
        var l5 = NewListing(p5, ListingType.Rent, "Jednosoban stan, Zenica", 600, bam, ListingStatus.Active, 300);
        var l6 = NewListing(p6, ListingType.Rent, "Garaža za najam, Tuzla", 100, bam, ListingStatus.Draft);

        // ---------- requests ----------
        RequestEntity NewRequest(ListingEntity l, UserEntity who, RequestStatus status, string msg,
            DateOnly? from = null, DateOnly? to = null) => new()
        {
            Listing = l, Requester = who, Status = status, Message = msg,
            DesiredStartDate = from, DesiredEndDate = to,
            RespondedAtUtc = status == RequestStatus.Pending ? null : DateTime.UtcNow.AddDays(-45)
        };

        var startOfRent = new DateOnly(today.Year, today.Month, 1).AddMonths(-3);
        var r1 = NewRequest(l1, tenant1, RequestStatus.Accepted, "Zainteresovan sam za najam na godinu dana.", startOfRent, startOfRent.AddMonths(12).AddDays(-1));
        var r2 = NewRequest(l2, tenant2, RequestStatus.Pending, "Da li je cijena fiksna? Želim razgledati kuću.");
        var r3 = NewRequest(l4, tenant2, RequestStatus.Accepted, "Želim kupiti zemljište.");
        var r4 = NewRequest(l5, tenant1, RequestStatus.Pending, "Mogu li useliti od prvog u mjesecu?", today.AddDays(14), today.AddMonths(12));
        var r5 = NewRequest(l5, tenant2, RequestStatus.Rejected, "Treba mi stan odmah.", today, today.AddMonths(6));
        l1.Requests.Add(r1); l2.Requests.Add(r2); l4.Requests.Add(r3); l5.Requests.Add(r4); l5.Requests.Add(r5);

        // ---------- contracts + installments + transactions + refunds ----------
        var c1 = new ContractEntity
        {
            Request = r1, ContractType = ContractType.Rent,
            SellerOrLandlord = owner1, BuyerOrTenant = tenant1,
            StartDate = startOfRent, EndDate = startOfRent.AddMonths(12).AddDays(-1),
            Amount = 900, Currency = bam, Status = ContractStatus.Active
        };

        for (var i = 0; i < 12; i++)
        {
            var due = startOfRent.AddMonths(i);
            var paid = due <= today;
            var inst = new RentInstallmentEntity
            {
                DueDate = due, Amount = 900, Currency = bam,
                Status = paid ? InstallmentStatus.Paid : InstallmentStatus.Unpaid
            };
            c1.Installments.Add(inst);
            if (!paid) continue;

            var inEur = i == 1;   // second installment is paid in EUR, rest in BAM
            var tx = new TransactionEntity
            {
                Installment = inst, Payer = tenant1, RecordedBy = owner1,
                OriginalAmount = 900, OriginalCurrency = bam,
                PaidAmount = inEur ? Math.Round(900 / EurToBam, 2) : 900,
                PaidCurrency = inEur ? eur : bam,
                ExchangeRate = inEur ? eurRate : null,
                AppliedRate = inEur ? EurToBam : 1m,
                Status = TransactionStatus.Completed,
                ExecutedAtUtc = due.ToDateTime(new TimeOnly(9, 0), DateTimeKind.Utc)
            };
            c1.Transactions.Add(tx);

            if (inEur)
                tx.Refunds.Add(new RefundEntity
                {
                    Amount = 20, Currency = eur, ExchangeRate = eurRate, AppliedRate = EurToBam,
                    Reason = "Povrat dijela uplate (korekcija obračuna)", CreatedBy = owner1
                });
        }

        // ---------- contracts ----------
        var c2 = new ContractEntity
        {
            Request = r3, ContractType = ContractType.Sale,
            SellerOrLandlord = owner2, BuyerOrTenant = tenant2,
            StartDate = today.AddDays(-20), EndDate = null,
            Amount = 45000, Currency = bam, Status = ContractStatus.Completed
        };
        c2.Transactions.Add(new TransactionEntity
        {
            Payer = tenant2, RecordedBy = owner2,
            OriginalAmount = 45000, OriginalCurrency = bam,
            PaidAmount = 45000, PaidCurrency = bam, AppliedRate = 1m,
            Status = TransactionStatus.Completed,
            ExecutedAtUtc = DateTime.UtcNow.AddDays(-20)
        });

        // ---------- favorites ----------
        var favorites = new[]
        {
            new FavoriteEntity { User = tenant1, Listing = l2 },
            new FavoriteEntity { User = tenant1, Listing = l3 },
            new FavoriteEntity { User = tenant2, Listing = l5 }
        };

        db.Properties.AddRange(props);
        db.Listings.AddRange(l1, l2, l3, l4, l5, l6);
        db.Contracts.AddRange(c1, c2);
        db.Favorites.AddRange(favorites);
        await db.SaveChangesAsync(ct);
    }

    private async Task<UserEntity> GetOrCreateUserAsync(string email, string firstName, string lastName, CancellationToken ct)
    {
        var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (existing is not null) return existing;

        var user = new UserEntity
        {
            Firstname = firstName,
            Lastname = lastName,
            Email = email,
            IsAdmin=false,
            IsEnabled = true
        };
        user.PasswordHash = passwordHasher.HashPassword(user, "Test123!");
        db.Users.Add(user);
        return user;
    }
}
