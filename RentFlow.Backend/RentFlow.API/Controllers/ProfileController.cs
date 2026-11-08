using RentFlow.Application.Modules.Profile.Commands.UpdateMyProfile;
using RentFlow.Application.Modules.Profile.Commands.UploadProfileImage;
using RentFlow.Application.Modules.Profile.Queries.GetMyProfile;

namespace RentFlow.WebApi.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public sealed class ProfileController(ISender mediator) : ControllerBase
{
    [HttpGet("me")]
    public Task<GetMyProfileQueryDto> GetMe(CancellationToken ct)   
        => mediator.Send(new GetMyProfileQuery(), ct);

    [HttpPut("me")]
    public Task<UpdateMyProfileCommandDto> Update(UpdateMyProfileCommand command, CancellationToken ct)
        => mediator.Send(command, ct);

    [HttpPost("me/profile-image")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public Task<UploadProfileImageCommandDto> UploadProfileImage(IFormFile file, CancellationToken ct)
        => Upload(file, ProfileImageKind.Profile, ct);

    [HttpPost("me/cover-image")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public Task<UploadProfileImageCommandDto> UploadCoverImage(IFormFile file, CancellationToken ct)
        => Upload(file, ProfileImageKind.Cover, ct);

    private async Task<UploadProfileImageCommandDto> Upload(IFormFile file, ProfileImageKind kind, CancellationToken ct)
    {
        await using var stream = file.OpenReadStream();
        return await mediator.Send(new UploadProfileImageCommand
        {
            Content = stream,
            ContentType = file.ContentType,
            Length = file.Length,
            Kind = kind
        }, ct);
    }
}