using FluentValidation;
using RentFlow.Application.Modules.Properties.Commands.DeletePropertyImage;
using RentFlow.Application.Modules.Properties.Commands.ReorderPropertyImages;
using RentFlow.Application.Modules.Properties.Commands.SetMainPropertyImage;
using RentFlow.Application.Modules.Properties.Commands.UploadPropertyImage;
using RentFlow.Domain.Entities.Property;

namespace RentFlow.Tests.Properties;

public sealed class PropertyImageTests
{
    [Fact]
    public async Task UploadPropertyImage_FirstImageBecomesMainAndUsesDetectedExtension()
    {
        using var fixture = new PropertyTestFixture();
        var property = fixture.AddProperty();
        var content = new MemoryStream(ValidJpegBytes());

        var image = await new UploadPropertyImageCommandHandler(fixture.Context, fixture.CurrentUser, fixture.Storage)
            .Handle(new UploadPropertyImageCommand
            {
                PropertyId = property.Id,
                Content = content,
                ContentType = "image/png",
                Length = content.Length
            }, CancellationToken.None);

        Assert.True(image.IsMain);
        Assert.Equal(0, image.SortOrder);
        Assert.Equal(".jpg", Assert.Single(fixture.Storage.SavedFiles).Extension);
        Assert.Equal("property-images", fixture.Storage.SavedFiles[0].Folder);
    }

    [Fact]
    public async Task UploadPropertyImage_AppendsAfterHighestSortOrder()
    {
        using var fixture = new PropertyTestFixture();
        var property = fixture.AddProperty();
        fixture.Context.PropertyImages.Add(new PropertyImageEntity
        {
            PropertyId = property.Id,
            Url = "/existing.jpg",
            IsMain = true,
            SortOrder = 4
        });
        await fixture.Context.SaveChangesAsync();
        var content = new MemoryStream(ValidJpegBytes());

        var image = await new UploadPropertyImageCommandHandler(fixture.Context, fixture.CurrentUser, fixture.Storage)
            .Handle(new UploadPropertyImageCommand
            {
                PropertyId = property.Id,
                Content = content,
                ContentType = "image/jpeg",
                Length = content.Length
            }, CancellationToken.None);

        Assert.False(image.IsMain);
        Assert.Equal(5, image.SortOrder);
    }

    [Fact]
    public async Task UploadPropertyImage_RejectsInvalidImageContent()
    {
        using var fixture = new PropertyTestFixture();
        var property = fixture.AddProperty();
        var content = new MemoryStream(new byte[12]);

        await Assert.ThrowsAsync<ValidationException>(() =>
            new UploadPropertyImageCommandHandler(fixture.Context, fixture.CurrentUser, fixture.Storage)
                .Handle(new UploadPropertyImageCommand
                {
                    PropertyId = property.Id,
                    Content = content,
                    ContentType = "image/jpeg",
                    Length = content.Length
                }, CancellationToken.None));

        Assert.Empty(fixture.Storage.SavedFiles);
        Assert.Empty(await fixture.Context.PropertyImages.ToListAsync());
    }

    [Fact]
    public async Task UploadPropertyImage_RejectsMoreThanTenActiveImages()
    {
        using var fixture = new PropertyTestFixture();
        var property = fixture.AddProperty();
        fixture.Context.PropertyImages.AddRange(Enumerable.Range(0, 10).Select(i => new PropertyImageEntity
        {
            PropertyId = property.Id,
            Url = $"/{i}.jpg",
            SortOrder = i
        }));
        await fixture.Context.SaveChangesAsync();
        var content = new MemoryStream(ValidJpegBytes());

        await Assert.ThrowsAsync<ValidationException>(() =>
            new UploadPropertyImageCommandHandler(fixture.Context, fixture.CurrentUser, fixture.Storage)
                .Handle(new UploadPropertyImageCommand
                {
                    PropertyId = property.Id,
                    Content = content,
                    ContentType = "image/jpeg",
                    Length = content.Length
                }, CancellationToken.None));

        Assert.Empty(fixture.Storage.SavedFiles);
        Assert.Equal(10, await fixture.Context.PropertyImages.CountAsync());
    }

    [Fact]
    public async Task UploadPropertyImageValidator_EnforcesSizeAndContentType()
    {
        var validator = new UploadPropertyImageCommandValidator();
        var valid = CreateUploadCommand();
        var oversized = await validator.ValidateAsync(CreateUploadCommand(length: 5 * 1024 * 1024 + 1));
        var empty = await validator.ValidateAsync(CreateUploadCommand(length: 0));
        var wrongType = await validator.ValidateAsync(CreateUploadCommand(contentType: "image/gif"));

        Assert.True((await validator.ValidateAsync(valid)).IsValid);
        Assert.Contains(oversized.Errors, x => x.PropertyName == "Length");
        Assert.Contains(empty.Errors, x => x.PropertyName == "Length");
        Assert.Contains(wrongType.Errors, x => x.PropertyName == "ContentType");
    }

    [Fact]
    public async Task DeleteMainImage_SoftDeletesItPromotesNextAndDeletesStoredFile()
    {
        using var fixture = new PropertyTestFixture();
        var property = fixture.AddProperty();
        var main = new PropertyImageEntity
        {
            PropertyId = property.Id,
            Url = "/main.jpg",
            IsMain = true,
            SortOrder = 0
        };
        var next = new PropertyImageEntity
        {
            PropertyId = property.Id,
            Url = "/next.jpg",
            SortOrder = 1
        };
        fixture.Context.PropertyImages.AddRange(main, next);
        await fixture.Context.SaveChangesAsync();

        await new DeletePropertyImageCommandHandler(fixture.Context, fixture.CurrentUser, fixture.Storage)
            .Handle(new DeletePropertyImageCommand(property.Id, main.Id), CancellationToken.None);

        Assert.True(main.IsDeleted);
        Assert.True(next.IsMain);
        Assert.Equal("/main.jpg", Assert.Single(fixture.Storage.DeletedFiles));
    }

    [Fact]
    public async Task SetMainPropertyImage_EnsuresExactlyOneActiveMainImage()
    {
        using var fixture = new PropertyTestFixture();
        var property = fixture.AddProperty();
        var first = new PropertyImageEntity { PropertyId = property.Id, Url = "/first.jpg", IsMain = true };
        var second = new PropertyImageEntity { PropertyId = property.Id, Url = "/second.jpg" };
        fixture.Context.PropertyImages.AddRange(first, second);
        await fixture.Context.SaveChangesAsync();

        await new SetMainPropertyImageCommandHandler(fixture.Context, fixture.CurrentUser)
            .Handle(new SetMainPropertyImageCommand(property.Id, second.Id), CancellationToken.None);

        Assert.False(first.IsMain);
        Assert.True(second.IsMain);
    }

    [Fact]
    public async Task ReorderPropertyImages_RequiresEveryActiveImageExactlyOnceAndUpdatesOrder()
    {
        using var fixture = new PropertyTestFixture();
        var property = fixture.AddProperty();
        var first = new PropertyImageEntity { PropertyId = property.Id, Url = "/first.jpg", SortOrder = 0 };
        var second = new PropertyImageEntity { PropertyId = property.Id, Url = "/second.jpg", SortOrder = 1 };
        fixture.Context.PropertyImages.AddRange(first, second);
        await fixture.Context.SaveChangesAsync();
        var handler = new ReorderPropertyImagesCommandHandler(fixture.Context, fixture.CurrentUser);

        await handler.Handle(new ReorderPropertyImagesCommand
        {
            PropertyId = property.Id,
            ImageIds = [second.Id, first.Id]
        }, CancellationToken.None);

        Assert.Equal(0, second.SortOrder);
        Assert.Equal(1, first.SortOrder);
        await Assert.ThrowsAsync<ValidationException>(() => handler.Handle(new ReorderPropertyImagesCommand
        {
            PropertyId = property.Id,
            ImageIds = [second.Id, second.Id]
        }, CancellationToken.None));
    }

    private static UploadPropertyImageCommand CreateUploadCommand(long length = 1, string contentType = "IMAGE/PNG") => new()
    {
        PropertyId = 1,
        Content = Stream.Null,
        ContentType = contentType,
        Length = length
    };

    private static byte[] ValidJpegBytes() => [0xFF, 0xD8, 0xFF, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}
