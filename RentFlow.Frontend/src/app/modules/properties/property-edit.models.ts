import { ListingKind, PropertyImage, PropertyType, FurnishedStatus, HeatingType, PropertyCondition } from './property.models';
import { ListingStatus } from '../listings/listing.models';

/** Response of GET /api/properties/{id}. */
export interface PropertyDetails {
  id: number;
  ownerId: number;
  cityId: number;
  cityName: string;
  propertyType: PropertyType;
  address: string;
  description: string | null;
  areaM2: number;
  plotAreaM2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  yearBuilt: number | null;
  heatingType: HeatingType | null;
  furnishedStatus: FurnishedStatus | null;
  condition: PropertyCondition | null;
  latitude: number | null;
  longitude: number | null;
  createdAtUtc: string;
  images: PropertyImage[];
  amenities: { id: number; name: string }[];
  currentListing: PropertyListingSummary | null;
}

export interface PropertyListingSummary {
  id: number;
  listingType: ListingKind;
  title: string;
  price: number;
  currencyId: number;
  currencyCode: string;
  deposit: number | null;
  isNegotiable: boolean;
  status: ListingStatus;
  publishedAtUtc: string | null;
}

/** Body of PUT /api/listings/{id}. */
export interface ListingUpdateRequest {
  listingType: ListingKind;
  title: string;
  price: number;
  currencyId: number;
  deposit: number | null;
  isNegotiable: boolean;
}