export type ImageKind = 'profile' | 'cover';

export interface FeaturedListing {
  listingId: number;
  title: string;
  description: string | null;
  price: number;
  currencyCode: string;
  mainImageUrl: string | null;
}

export interface SavedListing {
  listingId: number;
  title: string;
  cityName: string;
  propertyType: string; // Apartment, House, Commercial, Land, Garage, Other
  listingType: string;  // Rent, Sale
  price: number;
  currencyCode: string;
  mainImageUrl: string | null;
}

export interface MyProfile {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  profileDescription: string | null;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  isVerified: boolean;
  isEnabled: boolean;
  memberSinceUtc: string;
  propertiesCount: number;
  featuredListing: FeaturedListing | null;
  savedListings: SavedListing[];
}

export interface UpdateProfileRequest {
  firstname: string;
  lastname: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  profileDescription: string | null;
}