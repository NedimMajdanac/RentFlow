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
    /// Short profile bio shown on "Moj profil". (optional)
    /// </summary>
    public string? ProfileDescription { get; set; }

    /// <summary>
    /// Relative URL of the profile photo, e.g. "/uploads/profile-images/abc.jpg". (optional)
    /// </summary>
    public string? ProfileImageUrl { get; set; }

    /// <summary>
    /// Relative URL of the cover photo. (optional)
    /// </summary>
    public string? CoverImageUrl { get; set; }

    /// <summary>
    /// True when phone, city and address are all filled in. Computed, never set directly.
    /// </summary>
    public bool IsVerified { get; private set; }

    /// <summary>
    /// Recalculates <see cref="IsVerified"/>. Call after any change of Phone, City or Address.
    /// </summary>
    public void UpdateVerification()
    {
        IsVerified = !string.IsNullOrWhiteSpace(Phone)
                  && !string.IsNullOrWhiteSpace(City)
                  && !string.IsNullOrWhiteSpace(Address);
    }

    /// <summary>
    /// Changes the admin flag and revokes all issued tokens, so the change applies immediately.
    /// </summary>
    public void SetAdmin(bool value)
    {
        if (IsAdmin == value) return;
        IsAdmin = value;
        TokenVersion++;
    }

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
        public const int ProfileDescriptionMaxLength = 1000;
        public const int ImageUrlMaxLength = 500;
    }
}