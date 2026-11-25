using RentFlow.Application.Common;
using RentFlow.Application.Modules.Listings.Commands.ChangeListingStatus;
using RentFlow.Application.Modules.Listings.Commands.CreateListing;
using RentFlow.Application.Modules.Listings.Commands.DeleteListing;
using RentFlow.Application.Modules.Listings.Commands.Favorites;
using RentFlow.Application.Modules.Listings.Commands.RecordListingView;
using RentFlow.Application.Modules.Listings.Commands.UpdateListing;
using RentFlow.Application.Modules.Listings.Common;
using RentFlow.Application.Modules.Listings.Queries.BrowseListings;
using RentFlow.Application.Modules.Listings.Queries.GetListingById;
using RentFlow.Application.Modules.Listings.Queries.GetMyListings;

namespace RentFlow.API.Controllers;

[ApiController]
[Route("api/listings")]
[Authorize]
public sealed class ListingsController(ISender mediator) : ControllerBase
{
    [HttpGet]
    public Task<PageResult<BrowseListingsQueryDto>> Browse([FromQuery] BrowseListingsQuery query, CancellationToken ct)
        => mediator.Send(query, ct);

    [HttpGet("my")]
    public Task<PageResult<GetMyListingsQueryDto>> GetMine([FromQuery] GetMyListingsQuery query, CancellationToken ct)
        => mediator.Send(query, ct);

    [HttpGet("{id:int}")]
    public Task<GetListingByIdQueryDto> GetById(int id, CancellationToken ct)
        => mediator.Send(new GetListingByIdQuery(id), ct);

    [HttpPost]
    public async Task<ActionResult<CreateListingCommandDto>> Create(CreateListingCommand command, CancellationToken ct)
    {
        var result = await mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateListingCommand command, CancellationToken ct)
    {
        await mediator.Send(command with { Id = id }, ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await mediator.Send(new DeleteListingCommand(id), ct);
        return NoContent();
    }

    [HttpPost("{id:int}/publish")]
    public Task<ChangeListingStatusCommandDto> Publish(int id, CancellationToken ct)
        => mediator.Send(new ChangeListingStatusCommand(id, ListingAction.Publish), ct);

    [HttpPost("{id:int}/unpublish")]
    public Task<ChangeListingStatusCommandDto> Unpublish(int id, CancellationToken ct)
        => mediator.Send(new ChangeListingStatusCommand(id, ListingAction.Unpublish), ct);

    [HttpPost("{id:int}/close")]
    public Task<ChangeListingStatusCommandDto> Close(int id, CancellationToken ct)
        => mediator.Send(new ChangeListingStatusCommand(id, ListingAction.Close), ct);

    [HttpPost("{id:int}/reopen")]
    public Task<ChangeListingStatusCommandDto> Reopen(int id, CancellationToken ct)
        => mediator.Send(new ChangeListingStatusCommand(id, ListingAction.Reopen), ct);

    [HttpPut("{id:int}/favorite")]
    public async Task<IActionResult> AddFavorite(int id, CancellationToken ct)
    {
        await mediator.Send(new AddFavoriteCommand(id), ct);
        return NoContent();
    }

    [HttpDelete("{id:int}/favorite")]
    public async Task<IActionResult> RemoveFavorite(int id, CancellationToken ct)
    {
        await mediator.Send(new RemoveFavoriteCommand(id), ct);
        return NoContent();
    }

    [HttpPost("{id:int}/view")]
    public async Task<IActionResult> RecordView(int id, CancellationToken ct)
    {
        await mediator.Send(new RecordListingViewCommand(id), ct);
        return NoContent();
    }
}