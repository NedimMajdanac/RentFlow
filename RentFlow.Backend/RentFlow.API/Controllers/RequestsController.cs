using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentFlow.Application.Common;
using RentFlow.Application.Modules.Requests.Commands.ChangeRequestStatus;
using RentFlow.Application.Modules.Requests.Commands.CreateRequest;
using RentFlow.Application.Modules.Requests.Common;
using RentFlow.Application.Modules.Requests.Queries.GetMyRequests;
using RentFlow.Application.Modules.Requests.Queries.GetRequestById;

namespace RentFlow.WebApi.Controllers;

[ApiController]
[Route("api/requests")]
[Authorize]
public sealed class RequestsController(ISender mediator) : ControllerBase
{
    [HttpPost("{id:int}/accept")]
    public Task<ChangeRequestStatusCommandDto> Accept(int id, CancellationToken ct)
        => mediator.Send(new ChangeRequestStatusCommand(id, RequestAction.Accept), ct);

    [HttpPost("{id:int}/reject")]
    public Task<ChangeRequestStatusCommandDto> Reject(int id, CancellationToken ct)
        => mediator.Send(new ChangeRequestStatusCommand(id, RequestAction.Reject), ct);

    [HttpPost("{id:int}/cancel")]
    public Task<ChangeRequestStatusCommandDto> Cancel(int id, CancellationToken ct)
        => mediator.Send(new ChangeRequestStatusCommand(id, RequestAction.Cancel), ct);

    [HttpPost]
    public async Task<ActionResult<CreateRequestCommandDto>> Create(CreateRequestCommand command, CancellationToken ct)
    {
        var result = await mediator.Send(command, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("my")]
    public Task<PageResult<GetMyRequestsQueryDto>> GetMine([FromQuery] GetMyRequestsQuery query, CancellationToken ct)
        => mediator.Send(query, ct);

    [HttpGet("{id:int}")]
    public Task<GetRequestByIdQueryDto> GetById(int id, CancellationToken ct)
        => mediator.Send(new GetRequestByIdQuery(id), ct);
}