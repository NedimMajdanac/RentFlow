using RentFlow.Application.Abstractions;
using RentFlow.Infrastructure.Common;
using RentFlow.Infrastructure.Database;
using RentFlow.Infrastructure.Database.Seeders;
using RentFlow.Shared.Constants;
using RentFlow.Shared.Options;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using RentFlow.Domain.Entities.Identity;

namespace RentFlow.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment env)
    {
        // Typed ConnectionStrings + validation
        services.AddOptions<ConnectionStringsOptions>()
            .Bind(configuration.GetSection(ConnectionStringsOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        // DbContext: InMemory for automated integration tests; SQL Server otherwise
        services.AddDbContext<DatabaseContext>((sp, options) =>
        {
            if (env.IsIntegrationTests())
            {
                options.UseInMemoryDatabase("IntegrationTestsDb");

                return;
            }

            var cs = sp.GetRequiredService<IOptions<ConnectionStringsOptions>>().Value.Main;
            options.UseSqlServer(cs);
        });

        // IAppDbContext mapping
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<DatabaseContext>());
        services.AddScoped<DynamicDataSeeder>();

        // Identity hasher
        services.AddScoped<IPasswordHasher<UserEntity>, PasswordHasher<UserEntity>>();

        // Token service (reads JwtOptions via IOptions<JwtOptions>)
        services.AddTransient<IJwtTokenService, JwtTokenService>();

        // HttpContext accessor + current user
        services.AddHttpContextAccessor();
        services.AddScoped<IAppCurrentUser, AppCurrentUser>();

        // TimeProvider (if used in handlers/services)
        services.AddSingleton<TimeProvider>(TimeProvider.System);

        // Currency conversion (reads rates from the database)
        services.AddScoped<ICurrencyConverter, CurrencyConverter>();

        AddExchangeRateProvider(services, configuration);

        return services;
    }

    
    private static void AddExchangeRateProvider(IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<ExchangeRatesOptions>()
            .Bind(configuration.GetSection(ExchangeRatesOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddHttpClient<IExchangeRateProvider, FrankfurterExchangeRateProvider>((sp, client) =>
        {
            var options = sp.GetRequiredService<IOptions<ExchangeRatesOptions>>().Value;
            client.BaseAddress = new Uri(options.FrankfurterBaseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(10);
        });
    }
}
