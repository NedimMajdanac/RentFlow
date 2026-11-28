namespace RentFlow.Application.Common;

public static class SaveExtensions
{
    /// <summary>
    /// Saves and turns a lost concurrency race into a clean conflict. Two people changing the same listing at
    /// the same time (for example, accepting two requests) cannot both win: the second one is rejected.
    /// </summary>
    public static async Task<int> SaveChangesCheckedAsync(this IAppDbContext ctx, CancellationToken ct)
    {
        try
        {
            return await ctx.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw Problems.Conflict("Podaci su u međuvremenu izmijenjeni. Osvježite stranicu i pokušajte ponovo.");
        }
    }
}