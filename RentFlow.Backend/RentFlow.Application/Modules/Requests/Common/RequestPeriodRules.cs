using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Requests.Common;

public static class RequestPeriodRules
{
    public const int MaxRentalDays = 3650; // 10 years

    /// <summary>Pure validation of the requested period; returns (field, message) pairs, empty when valid.</summary>
    public static List<(string Field, string Message)> Validate(
        ListingType type, DateOnly? start, DateOnly? end, DateOnly today)
    {
        var errors = new List<(string, string)>();

        if (type == ListingType.Sale)
        {
            if (start is not null || end is not null)
                errors.Add(("DesiredStartDate", "Za kupovinu se ne unosi period."));
            return errors;
        }

        if (start is null) errors.Add(("DesiredStartDate", "Unesite željeni početak najma."));
        if (end is null) errors.Add(("DesiredEndDate", "Unesite željeni kraj najma."));
        if (start is null || end is null) return errors;

        if (start < today) errors.Add(("DesiredStartDate", "Početak najma ne može biti u prošlosti."));
        if (end <= start) errors.Add(("DesiredEndDate", "Kraj najma mora biti poslije početka."));
        else if (end.Value.DayNumber - start.Value.DayNumber > MaxRentalDays)
            errors.Add(("DesiredEndDate", "Najam može trajati najviše 10 godina."));

        return errors;
    }
}