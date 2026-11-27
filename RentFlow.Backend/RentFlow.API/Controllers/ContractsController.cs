using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentFlow.Application.Modules.Contracts.Commands.ChangeContractStatus;
using RentFlow.Application.Modules.Contracts.Common;

namespace RentFlow.WebApi.Controllers;

[ApiController]
[Route("api/contracts")]
[Authorize]
public sealed class ContractsController(ISender mediator) : ControllerBase
{
    [HttpPost("{id:int}/activate")]
    public Task<ChangeContractStatusCommandDto> Activate(int id, CancellationToken ct)
        => mediator.Send(new ChangeContractStatusCommand(id, ContractAction.Activate), ct);

    [HttpPost("{id:int}/complete")]
    public Task<ChangeContractStatusCommandDto> Complete(int id, CancellationToken ct)
        => mediator.Send(new ChangeContractStatusCommand(id, ContractAction.Complete), ct);

    [HttpPost("{id:int}/terminate")]
    public Task<ChangeContractStatusCommandDto> Terminate(int id, CancellationToken ct)
        => mediator.Send(new ChangeContractStatusCommand(id, ContractAction.Terminate), ct);
}