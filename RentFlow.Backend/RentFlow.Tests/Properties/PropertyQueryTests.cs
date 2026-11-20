using RentFlow.Application.Modules.Properties.Queries.GetMyProperties;
using RentFlow.Application.Modules.Properties.Queries.GetPropertyById;
using RentFlow.Domain.Entities.Property;
using RentFlow.Domain.Enums;

namespace RentFlow.Tests.Properties;

public sealed class PropertyQueryTests
{
    [Fact]
    public async Task GetMyProperties_FiltersByOwnerAndSearchesAddressOrCityWithPaging()
    {
        using var fixture = new PropertyTestFixture();
        var first = fixture.AddProperty(address: "Oak Avenue");
        var second = fixture.AddProperty(address: "Pine Road", type: PropertyType.House);
        fixture.AddProperty(ownerId: 2, address: "Oak Avenue 2");
        fixture.Context.PropertyImages.AddRange(
            new PropertyImageEntity { PropertyId = first.Id, Url = "/first.jpg", SortOrder = 0 },
            new PropertyImageEntity { PropertyId = first.Id, Url = "/main.jpg", IsMain = true, SortOrder = 1 });
        await fixture.Context.SaveChangesAsync();

        var result = await new GetMyPropertiesQueryHandler(fixture.Context, fixture.CurrentUser)
            .Handle(new GetMyPropertiesQuery
            {
                Search = "  Oak ",
                PageNumber = 1,
                PageSize = 1
            }, CancellationToken.None);

        Assert.Equal(1, result.TotalItems);
        Assert.Equal(1, result.TotalPages);
        Assert.Equal(1, result.CurrentPage);
        var item = Assert.Single(result.Items);
        Assert.Equal(first.Id, item.Id);
        Assert.Equal("/main.jpg", item.MainImageUrl);
        Assert.Equal("Sarajevo", item.CityName);
        Assert.NotEqual(second.Id, item.Id);
    }

    [Fact]
    public async Task GetMyProperties_FiltersByTypeAndCityAndReturnsPagingMetadata()
    {
        using var fixture = new PropertyTestFixture();
        fixture.AddProperty(address: "Apartment");
        var house = fixture.AddProperty(address: "House", type: PropertyType.House);
        fixture.AddProperty(ownerId: 2, address: "Other owner", type: PropertyType.House);

        var result = await new GetMyPropertiesQueryHandler(fixture.Context, fixture.CurrentUser)
            .Handle(new GetMyPropertiesQuery
            {
                PropertyType = PropertyType.House,
                CityId = 1,
                PageNumber = 1,
                PageSize = 1
            }, CancellationToken.None);

        Assert.Equal(1, result.TotalItems);
        Assert.Equal(1, result.TotalPages);
        Assert.Equal(house.Id, Assert.Single(result.Items).Id);
    }

    [Fact]
    public async Task GetMyPropertiesValidator_RejectsInvalidPagingSearchAndType()
    {
        var validator = new GetMyPropertiesQueryValidator();
        var invalid = await validator.ValidateAsync(new GetMyPropertiesQuery
        {
            PageNumber = 0,
            PageSize = 51,
            Search = new string('x', 101),
            PropertyType = (PropertyType)999
        });

        Assert.Contains(invalid.Errors, x => x.PropertyName == "PageNumber");
        Assert.Contains(invalid.Errors, x => x.PropertyName == "PageSize");
        Assert.Contains(invalid.Errors, x => x.PropertyName == "Search");
        Assert.Contains(invalid.Errors, x => x.PropertyName == "PropertyType");
    }

    [Fact]
    public async Task GetPropertyById_ReturnsImagesAndAmenitiesInDisplayOrderAndOmitsDeletedRecords()
    {
        using var fixture = new PropertyTestFixture();
        var property = fixture.AddProperty();
        fixture.Context.PropertyImages.AddRange(
            new PropertyImageEntity { PropertyId = property.Id, Url = "/later.jpg", SortOrder = 2 },
            new PropertyImageEntity { PropertyId = property.Id, Url = "/earlier.jpg", SortOrder = 1 },
            new PropertyImageEntity { PropertyId = property.Id, Url = "/deleted.jpg", SortOrder = 0, IsDeleted = true });
        fixture.Context.PropertyAmenities.AddRange(
            new PropertyAmenityEntity { PropertyId = property.Id, AmenityId = 2 },
            new PropertyAmenityEntity { PropertyId = property.Id, AmenityId = 1 },
            new PropertyAmenityEntity { PropertyId = property.Id, AmenityId = 3, IsDeleted = true });
        await fixture.Context.SaveChangesAsync();

        var result = await new GetPropertyByIdQueryHandler(fixture.Context, fixture.CurrentUser)
            .Handle(new GetPropertyByIdQuery(property.Id), CancellationToken.None);

        Assert.Equal(new[] { "/earlier.jpg", "/later.jpg" }, result.Images.Select(x => x.Url));
        Assert.Equal(new[] { "Balcony", "Parking" }, result.Amenities.Select(x => x.Name));
        Assert.Equal(1, result.OwnerId);
    }

    [Fact]
    public async Task GetPropertyById_AllowsAdminButHidesAnotherOwnersPropertyFromRegularUser()
    {
        using var fixture = new PropertyTestFixture(userId: 2);
        var property = fixture.AddProperty(ownerId: 1);
        var handler = new GetPropertyByIdQueryHandler(fixture.Context, fixture.CurrentUser);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            handler.Handle(new GetPropertyByIdQuery(property.Id), CancellationToken.None));

        fixture.CurrentUser.IsAdmin = true;
        var result = await handler.Handle(new GetPropertyByIdQuery(property.Id), CancellationToken.None);

        Assert.Equal(property.Id, result.Id);
    }
}
