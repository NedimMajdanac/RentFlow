using RentFlow.Domain.Common;
using RentFlow.Domain.Entities.Listing;

namespace RentFlow.Domain.Entities.Identity;

public sealed class UserEntity : BaseEntity
{
    public string Firstname { get; set; } = string.Empty;
    public string Lastname { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// Phone number used for contact between owners and interested users. (optional)
    /// </summary>
    public string? Phone { get; set; }

    /// <summary>
    /// Street and house number, e.g. "Maršala Tita 1". (optional)
    /// </summary>
    public string? Address { get; set; }

    /// <summary>
    /// City, e.g. "Sarajevo". (optional)
    /// </summary>
    public string? City { get; set; }

    public bool IsAdmin { get; set; }
    public int TokenVersion { get; set; } = 0; // For global revocation
    public bool IsEnabled { get; set; } = true; // New accounts are enabled unless explicitly disabled

    public ICollection<RefreshTokenEntity> RefreshTokens { get; private set; } = new List<RefreshTokenEntity>();

    // Many-to-many: User's favorite listings (via FavoriteEntity)
    public ICollection<FavoriteEntity> FavoriteListings { get; private set; } = new List<FavoriteEntity>();

    /// <summary>
    /// Single source of truth for technical/business constraints.
    /// Used in validators and EF configuration.
    /// </summary>
    public static class Constraints
    {
        public const int FirstnameMaxLength = 100;

        public const int LastnameMaxLength = 100;

        public const int EmailMaxLength = 200;

        public const int PhoneMaxLength = 30;

        public const int AddressMaxLength = 200;

        public const int CityMaxLength = 100;
    }
}