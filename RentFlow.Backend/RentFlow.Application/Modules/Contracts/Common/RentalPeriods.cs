namespace RentFlow.Application.Modules.Contracts.Common;

public static class RentalPeriods
{
    /// <summary>Both ends are inclusive; a missing end date means "open-ended".</summary>
    public static bool Overlap(DateOnly aStart, DateOnly? aEnd, DateOnly bStart, DateOnly? bEnd)
        => aStart <= (bEnd ?? DateOnly.MaxValue) && bStart <= (aEnd ?? DateOnly.MaxValue);
}