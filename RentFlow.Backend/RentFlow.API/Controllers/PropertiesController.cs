using RentFlow.Application.Common;
using RentFlow.Application.Modules.Properties.Commands.CreateProperty;
using RentFlow.Application.Modules.Properties.Commands.DeleteProperty;
using RentFlow.Application.Modules.Properties.Commands.DeletePropertyImage;
using RentFlow.Application.Modules.Properties.Commands.ReorderPropertyImages;
using RentFlow.Application.Modules.Properties.Commands.SetMainPropertyImage;
using RentFlow.Application.Modules.Properties.Commands.UpdateProperty;
using RentFlow.Application.Modules.Properties.Commands.UploadPropertyImage;
using RentFlow.Application.Modules.Properties.Common;
using RentFlow.Application.Modules.Properties.Queries.GetMyProperties;
using RentFlow.Application.Modules.Properties.Queries.GetMyPropertiesSummary;
using RentFlow.Application.Modules.Properties.Queries.GetPropertyById;
using RentFlow.Application.Modules.Properties.Queries.GetPropertyStats;

namespace RentFlow.API.Controllers;

[ApiController]
[Route("api/properties")]
[Authorize]
public sealed class PropertiesController(ISender mediator) : ControllerBase
{
    [HttpGet("my")]
    public Task<PageResult<GetMyPropertiesQueryDto>> GetMine([FromQuery] GetMyPropertiesQuery query, CancellationToken ct)
        => mediator.Send(query, ct);

    [HttpGet("my/summary")]
    public Task<GetMyPropertiesSummaryQueryDto> GetMySummary(CancellationToken ct)
    => mediator.Send(new GetMyPropertiesSummaryQuery(), ct);

    [HttpGet("{id:int}")]
    public Task<GetPropertyByIdQueryDto> GetById(int id, CancellationToken ct)
        => mediator.Send(new GetPropertyByIdQuery(id), ct);

    [HttpPost]
    public async Task<ActionResult<CreatePropertyCommandDto>> Create(CreatePropertyCommand command, CancellationToken ct)
    {
        var result = await mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdatePropertyCommand command, CancellationToken ct)
    {
        await mediator.Send(command with { Id = id }, ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await mediator.Send(new DeletePropertyCommand(id), ct);
        return NoContent();
    }

    [HttpPost("{id:int}/images")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<PropertyImageDto> UploadImage(int id, IFormFile file, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        return await mediator.Send(new UploadPropertyImageCommand
        {
            PropertyId = id,
            Content = stream,
            ContentType = file.ContentType,
            Length = file.Length
        }, ct);
    }

    [HttpDelete("{id:int}/images/{imageId:int}")]
    public async Task<IActionResult> DeleteImage(int id, int imageId, CancellationToken ct)
    {
        await mediator.Send(new DeletePropertyImageCommand(id, imageId), ct);
        return NoContent();
    }

    [HttpPut("{id:int}/images/{imageId:int}/main")]
    public async Task<IActionResult> SetMainImage(int id, int imageId, CancellationToken ct)
    {
        await mediator.Send(new SetMainPropertyImageCommand(id, imageId), ct);
        return NoContent();
    }

    [HttpPut("{id:int}/images/order")]
    public async Task<IActionResult> ReorderImages(int id, ReorderPropertyImagesCommand command, CancellationToken ct)
    {
        await mediator.Send(command with { PropertyId = id }, ct);
        return NoContent();
    }

    [HttpGet("{id:int}/stats")]
    public Task<GetPropertyStatsQueryDto> GetStats(int id, CancellationToken ct)
        => mediator.Send(new GetPropertyStatsQuery(id), ct);
}