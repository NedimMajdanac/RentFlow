using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentFlow.Application.Modules.Requests.Commands.ChangeRequestStatus;
using RentFlow.Application.Modules.Requests.Common;

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
}