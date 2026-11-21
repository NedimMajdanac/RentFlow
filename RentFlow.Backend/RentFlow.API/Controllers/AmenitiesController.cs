
using RentFlow.Application.Modules.Amenities.Queries.GetAmenities;

namespace RentFlowAPI.Controllers;

[ApiController]
[Route("api/amenities")]
[Authorize]
public sealed class AmenitiesController(ISender mediator) : ControllerBase
{
    [HttpGet]
    public Task<List<GetAmenitiesQueryDto>> GetAll(CancellationToken ct)
        => mediator.Send(new GetAmenitiesQuery(), ct);
}