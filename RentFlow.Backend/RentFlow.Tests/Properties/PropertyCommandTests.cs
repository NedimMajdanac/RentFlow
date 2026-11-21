using FluentValidation;
using RentFlow.Application.Common.Exceptions;
using RentFlow.Application.Modules.Properties.Commands.CreateProperty;
using RentFlow.Application.Modules.Properties.Commands.DeleteProperty;
using RentFlow.Application.Modules.Properties.Commands.UpdateProperty;
using RentFlow.Domain.Entities.Listing;
using RentFlow.Domain.Entities.Property;
using RentFlow.Domain.Enums;

namespace RentFlow.Tests.Properties;

public sealed class PropertyCommandTests
{
    [Fact]
    public async Task CreateProperty_MapsFieldsTrimsTextAndAssignsOwnerAndAmenities()
    {
        using var fixture = new PropertyTestFixture();
        var command = ValidCreateCommand() with
        {
            Address = "  10 Main Street  ",
            Description = "  Bright apartment  ",
            AmenityIds = [1, 2]
        };

        var result = await new CreatePropertyCommandHandler(fixture.Context, fixture.CurrentUser)
            .Handle(command, CancellationToken.None);

        var property = await fixture.Context.Properties.FindAsync(result.Id);
        Assert.NotNull(property);
        Assert.Equal(1, property.OwnerId);
        Assert.Equal("10 Main Street", property.Address);
        Assert.Equal("Bright apartment", property.Description);
        Assert.Equal(new[] { 1, 2 }, fixture.Context.PropertyAmenities.Select(x => x.AmenityId).Order().ToArray());
    }

    [Fact]
    public async Task CreateProperty_ForLandClearsBuildingOnlyFields()
    {
        using var fixture = new PropertyTestFixture();
        var command = ValidCreateCommand() with
        {
            PropertyType = PropertyType.Land,
            PlotAreaM2 = 500,
            Rooms = 3,
            Bathrooms = 2,
            Floor = 1,
            TotalFloors = 2,
            YearBuilt = 2000,
            HeatingType = HeatingType.Gas,
            FurnishedStatus = FurnishedStatus.Furnished,
            Condition = PropertyCondition.Good
        };

        var result = await new CreatePropertyCommandHandler(fixture.Context, fixture.CurrentUser)
            .Handle(command, CancellationToken.None);

        var property = await fixture.Context.Properties.FindAsync(result.Id);
        Assert.NotNull(property);
        Assert.Equal(500, property.PlotAreaM2);
        Assert.Null(property.Rooms);
        Assert.Null(property.Bathrooms);
        Assert.Null(property.Floor);
        Assert.Null(property.TotalFloors);
        Assert.Null(property.YearBuilt);
        Assert.Null(property.HeatingType);
        Assert.Null(property.FurnishedStatus);
        Assert.Null(property.Condition);
    }

    [Fact]
    public async Task CreateProperty_RequiresSignedInUser()
    {
        using var fixture = new PropertyTestFixture(userId: null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            new CreatePropertyCommandHandler(fixture.Context, fixture.CurrentUser)
                .Handle(ValidCreateCommand(), CancellationToken.None));

        Assert.Empty(fixture.Context.Properties);
    }

    [Fact]
    public async Task UpdateProperty_ReconcilesAmenitiesAndClearsInapplicableFields()
    {
        using var fixture = new PropertyTestFixture();
        var property = fixture.AddProperty();
        fixture.Context.PropertyAmenities.AddRange(
            new PropertyAmenityEntity { PropertyId = property.Id, AmenityId = 1 },
            new PropertyAmenityEntity { PropertyId = property.Id, AmenityId = 2 });
        await fixture.Context.SaveChangesAsync();

        var command = ValidUpdateCommand(property.Id) with
        {
            PropertyType = PropertyType.Land,
            PlotAreaM2 = 900,
            Rooms = 4,
            AmenityIds = [2, 3]
        };
        await new UpdatePropertyCommandHandler(fixture.Context, fixture.CurrentUser)
            .Handle(command, CancellationToken.None);

        Assert.Equal("Updated address", property.Address);
        Assert.Null(property.Rooms);
        Assert.Equal(900, property.PlotAreaM2);
        var allLinks = await fixture.Context.PropertyAmenities.IgnoreQueryFilters().ToListAsync();
        Assert.Contains(allLinks, x => x.AmenityId == 1 && x.IsDeleted);
        Assert.Contains(allLinks, x => x.AmenityId == 2 && !x.IsDeleted);
        Assert.Contains(allLinks, x => x.AmenityId == 3 && !x.IsDeleted);
    }

    [Fact]
    public async Task UpdateProperty_HidesAnotherUsersProperty()
    {
        using var fixture = new PropertyTestFixture(userId: 2);
        var property = fixture.AddProperty(ownerId: 1);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            new UpdatePropertyCommandHandler(fixture.Context, fixture.CurrentUser)
                .Handle(ValidUpdateCommand(property.Id), CancellationToken.None));
    }

    [Fact]
    public async Task DeleteProperty_BlockedListingPreventsAnyDeletion()
    {
        using var fixture = new PropertyTestFixture();
        var property = fixture.AddProperty();
        fixture.Context.Listings.Add(new ListingEntity
        {
            PropertyId = property.Id,
            Status = ListingStatus.Active,
            Title = "Active listing"
        });
        fixture.Context.PropertyImages.Add(new PropertyImageEntity { PropertyId = property.Id, Url = "/image.jpg" });
        await fixture.Context.SaveChangesAsync();

        await Assert.ThrowsAsync<ConflictException>(() =>
            new DeletePropertyCommandHandler(fixture.Context, fixture.CurrentUser)
                .Handle(new DeletePropertyCommand(property.Id), CancellationToken.None));

        Assert.False(property.IsDeleted);
        Assert.Single(await fixture.Context.PropertyImages.ToListAsync());
    }

    [Fact]
    public async Task DeleteProperty_SoftDeletesDraftListingsAndRelatedRecords()
    {
        using var fixture = new PropertyTestFixture();
        var property = fixture.AddProperty();
        fixture.Context.Listings.Add(new ListingEntity
        {
            PropertyId = property.Id,
            Status = ListingStatus.Draft,
            Title = "Draft listing"
        });
        fixture.Context.PropertyImages.Add(new PropertyImageEntity { PropertyId = property.Id, Url = "/image.jpg" });
        fixture.Context.PropertyAmenities.Add(new PropertyAmenityEntity { PropertyId = property.Id, AmenityId = 1 });
        await fixture.Context.SaveChangesAsync();

        await new DeletePropertyCommandHandler(fixture.Context, fixture.CurrentUser)
            .Handle(new DeletePropertyCommand(property.Id), CancellationToken.None);

        Assert.True(property.IsDeleted);
        Assert.All(await fixture.Context.Listings.IgnoreQueryFilters().ToListAsync(), x => Assert.True(x.IsDeleted));
        Assert.All(await fixture.Context.PropertyImages.IgnoreQueryFilters().ToListAsync(), x => Assert.True(x.IsDeleted));
        Assert.All(await fixture.Context.PropertyAmenities.IgnoreQueryFilters().ToListAsync(), x => Assert.True(x.IsDeleted));
    }

    [Fact]
    public async Task PropertyCommandValidator_AcceptsInclusiveBusinessRuleBoundaries()
    {
        using var fixture = new PropertyTestFixture();
        var command = ValidCreateCommand() with
        {
            AreaM2 = 100_000,
            PlotAreaM2 = 10_000_000,
            Rooms = 50,
            Bathrooms = 20,
            Floor = 0,
            TotalFloors = 0,
            YearBuilt = 1800,
            Latitude = -90,
            Longitude = -180,
            AmenityIds = [1, 2, 3]
        };

        var result = await new CreatePropertyCommandValidator(fixture.Context).ValidateAsync(command);

        Assert.True(result.IsValid, string.Join("; ", result.Errors.Select(x => x.ErrorMessage)));
    }

    [Fact]
    public async Task PropertyCommandValidator_RejectsInvalidFieldsAndInconsistentCoordinates()
    {
        using var fixture = new PropertyTestFixture();
        var command = ValidCreateCommand() with
        {
            CityId = 99,
            PropertyType = (PropertyType)999,
            Address = " ",
            AreaM2 = 0,
            Rooms = 51,
            Floor = 3,
            TotalFloors = 2,
            Latitude = 10,
            Longitude = null,
            AmenityIds = [1, 1]
        };

        var result = await new CreatePropertyCommandValidator(fixture.Context).ValidateAsync(command);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(command.CityId));
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(command.PropertyType));
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(command.Address));
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(command.AreaM2));
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(command.Rooms));
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(command.Floor));
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(command.Longitude));
        Assert.Contains(result.Errors, x => x.PropertyName == nameof(command.AmenityIds));
    }

    [Fact]
    public async Task PropertyCommandValidator_RejectsTooManyOrUnknownAmenities()
    {
        using var fixture = new PropertyTestFixture();
        var validator = new CreatePropertyCommandValidator(fixture.Context);

        var tooMany = await validator.ValidateAsync(ValidCreateCommand() with { AmenityIds = Enumerable.Range(1, 31).ToList() });
        var unknown = await validator.ValidateAsync(ValidCreateCommand() with { AmenityIds = [100] });

        Assert.Contains(tooMany.Errors, x => x.PropertyName == "AmenityIds");
        Assert.Contains(unknown.Errors, x => x.PropertyName == "AmenityIds");
    }

    private static CreatePropertyCommand ValidCreateCommand() => new()
    {
        CityId = 1,
        PropertyType = PropertyType.Apartment,
        Address = "Main Street 1",
        Description = "Description",
        AreaM2 = 80,
        AmenityIds = []
    };

    private static UpdatePropertyCommand ValidUpdateCommand(int id) => new()
    {
        Id = id,
        CityId = 1,
        PropertyType = PropertyType.Apartment,
        Address = "Updated address",
        AreaM2 = 90,
        AmenityIds = []
    };
}
