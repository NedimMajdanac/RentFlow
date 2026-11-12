using System;
using System.Collections.Generic;
using System.Text;

namespace RentFlow.Application.Common;

public static class AuthClaims
{
    public const string IsAdmin = "is_admin";
}

public static class AuthPolicies
{
    public const string AdminOnly = "AdminOnly";
}
