using Microsoft.AspNetCore.Mvc;
using RentFlow.Application.Modules.Cities.Queries.GetCities;

namespace RentFlow.API.Controllers
{
    [ApiController]
    [Route("api/cities")]
    [Authorize]
    public sealed class CitiesController(ISender mediator) : ControllerBase
    {
        [HttpGet]
        public Task<List<GetCitiesQueryDto>> GetAll(CancellationToken ct)
            => mediator.Send(new GetCitiesQuery(), ct);
    }
}
