using Microsoft.EntityFrameworkCore;
using RentFlow.Application.Abstractions;
using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Property;
using RentFlow.Domain.Enums;
using RentFlow.Infrastructure.Database;

namespace RentFlow.Tests.Properties;

internal sealed class PropertyTestFixture : IDisposable
{
    public DatabaseContext Context { get; }
    public TestCurrentUser CurrentUser { get; } = new();
    public TestFileStorage Storage { get; } = new();

    public PropertyTestFixture(int? userId = 1, bool isAdmin = false)
    {
        var options = new DbContextOptionsBuilder<DatabaseContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        Context = new DatabaseContext(options, TimeProvider.System);
        CurrentUser.UserId = userId;
        CurrentUser.IsAdmin = isAdmin;
        Context.Cities.Add(new CityEntity { Id = 1, Name = "Sarajevo" });
        Context.Amenities.AddRange(
            new AmenityEntity { Id = 1, Name = "Parking" },
            new AmenityEntity { Id = 2, Name = "Balcony" },
            new AmenityEntity { Id = 3, Name = "Elevator" });
        Context.SaveChanges();
    }

    public PropertyEntity AddProperty(int ownerId = 1, string address = "Main Street 1", PropertyType type = PropertyType.Apartment)
    {
        var property = new PropertyEntity
        {
            OwnerId = ownerId,
            CityId = 1,
            PropertyType = type,
            Address = address,
            AreaM2 = 80
        };
        Context.Properties.Add(property);
        Context.SaveChanges();
        return property;
    }

    public void Dispose() => Context.Dispose();
}

internal sealed class TestCurrentUser : IAppCurrentUser
{
    public int? UserId { get; set; }
    public string? Email => "test@example.com";
    public bool IsAuthenticated => UserId.HasValue;
    public bool IsAdmin { get; set; }
    public bool IsManager => false;
    public bool IsEmployee => false;
}

internal sealed class TestFileStorage : IFileStorage
{
    public List<(string Folder, string Extension)> SavedFiles { get; } = [];
    public List<string> DeletedFiles { get; } = [];

    public Task<string> SaveAsync(Stream content, string folder, string extension, CancellationToken ct = default)
    {
        SavedFiles.Add((folder, extension));
        return Task.FromResult($"/uploads/{folder}/image{SavedFiles.Count}{extension}");
    }

    public Task DeleteAsync(string relativeUrl, CancellationToken ct = default)
    {
        DeletedFiles.Add(relativeUrl);
        return Task.CompletedTask;
    }
}
