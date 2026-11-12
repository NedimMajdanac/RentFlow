using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RentFlow.Application.Common;

namespace RentFlow.WebApi.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = AuthPolicies.AdminOnly)]
public sealed class AdminController : ControllerBase
{
    [HttpGet("access-check")]
    public IActionResult AccessCheck() => Ok(new { message = "Admin pristup potvrđen." });
}