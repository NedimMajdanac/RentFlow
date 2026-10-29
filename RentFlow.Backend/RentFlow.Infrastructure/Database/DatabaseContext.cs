
using RentFlow.Application.Abstractions;

namespace RentFlow.Infrastructure.Database;

public partial class DatabaseContext : DbContext, IAppDbContext
{

    private readonly TimeProvider _clock;
    public DatabaseContext(DbContextOptions<DatabaseContext> options, TimeProvider clock) : base(options)
    {
        _clock = clock;
    }
}
