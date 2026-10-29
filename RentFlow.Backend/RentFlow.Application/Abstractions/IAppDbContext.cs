using Market.Domain.Entities.Finance;
using Market.Domain.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using RentFlow.Domain.Entities.Identity;

namespace RentFlow.Application.Abstractions;

// Application layer
public interface IAppDbContext
{

    Task<int> SaveChangesAsync(CancellationToken ct);
}
