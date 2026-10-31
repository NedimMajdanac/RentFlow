namespace RentFlow.Application.Common.Exceptions;

/// <summary>
/// The caller is authenticated but is not allowed to perform the action (e.g. a non-admin user).
/// Mapped to HTTP 403 with code "auth.forbidden".
/// </summary>
public sealed class ForbiddenException : Exception
{
    public ForbiddenException(string message) : base(message) { }
}
