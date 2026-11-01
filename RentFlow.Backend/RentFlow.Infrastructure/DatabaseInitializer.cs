using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using RentFlow.Infrastructure.Database;
using RentFlow.Infrastructure.Database.Seeders;
using RentFlow.Shared.Constants;

namespace RentFlow.Infrastructure;

public static class DatabaseInitializer
{
    /// <summary>
    /// Centralized migration and seeding.
    /// </summary>
    public static async Task InitializeDatabaseAsync(this IServiceProvider services, IHostEnvironment env)
    {
        await using var scope = services.CreateAsyncScope();
        var ctx = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
        var seeder = scope.ServiceProvider.GetRequiredService<DynamicDataSeeder>();

        if (env.IsIntegrationTests())
        {
            // In-memory database: no migrations, the schema is created from the model
            await ctx.Database.EnsureCreatedAsync();
            await seeder.SeedAsync();
            return;
        }

        // SQL Server: applies pending migrations (same as "dotnet ef database update")
        await ctx.Database.MigrateAsync();

        // Demo data (the accounts from README) in Development and Testing, never in Production
        if (env.IsDevelopment() || env.IsTesting())
        {
            await seeder.SeedAsync();
        }
    }
}
