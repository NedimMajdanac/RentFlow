using RentFlow.Application.Modules.Currencies.Queries.GetCurrencies;

namespace RentFlow.API.Controllers;

[ApiController]
[Route("api/currencies")]
[Authorize]
public sealed class CurrenciesController(ISender mediator) : ControllerBase
{
    [HttpGet]
    public Task<List<GetCurrenciesQueryDto>> GetAll(CancellationToken ct)
        => mediator.Send(new GetCurrenciesQuery(), ct);
}