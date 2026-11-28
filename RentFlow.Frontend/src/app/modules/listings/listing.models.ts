import { ListingKind, PropertyType } from '../properties/property.models';

export type ListingStatus = 'Draft' | 'Active' | 'Reserved' | 'Rented' | 'Sold' | 'Closed';
export type ListingSort = 'Newest' | 'PriceAsc' | 'PriceDesc';

import { HeatingType, FurnishedStatus, PropertyCondition, PropertyImage } from '../properties/property.models';

export const LISTING_SORT_OPTIONS: { value: ListingSort; label: string }[] = [
  { value: 'Newest', label: 'Najnovije dodano' },
  { value: 'PriceAsc', label: 'Cijena: od najniže' },
  { value: 'PriceDesc', label: 'Cijena: od najviše' },
];

/** One item of GET /api/listings (only published listings of other users). */
export interface BrowseListing {
  id: number;
  title: string;
  listingType: ListingKind;
  status: ListingStatus; // Active or Reserved
  price: number;
  currencyCode: string;
  isNegotiable: boolean;
  publishedAtUtc: string | null;
  propertyType: PropertyType;
  address: string;
  cityName: string;
  areaM2: number;
  rooms: number | null;
  mainImageUrl: string | null;
  isFavorite: boolean;
}

export interface BrowseQuery {
  search: string;
  listingType: ListingKind | '';
  propertyType: PropertyType | '';
  cityId: number | null;
  /** Sent only when a price filter or price sort is active (the backend requires it then). */
  currencyId: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  minRooms: number | null;
  minAreaM2: number | null;
  maxAreaM2: number | null;
  amenityIds: number[];
  sort: ListingSort;
  pageNumber: number;
  pageSize: number;
}

/** Response of GET /api/listings/{id}. */
export interface ListingDetails {
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
  createdAtUtc: string;
  isOwner: boolean;
  isFavorite: boolean;
  property: ListingProperty;
  owner: ListingOwner;
  otherListings: OwnerListing[];
  /** Id of my pending or accepted request for this listing (null when there is none). */
  myActiveRequestId: number | null;
}

export interface ListingProperty {
  id: number;
  propertyType: PropertyType;
  address: string;
  cityId: number;
  cityName: string;
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
  images: PropertyImage[];
  amenities: { id: number; name: string }[];
}

/** Public data about the owner. The phone number and email are deliberately not exposed. */
export interface ListingOwner {
  id: number;
  name: string;
  isVerified: boolean;
  profileImageUrl: string | null;
  memberSinceUtc: string;
}

export interface OwnerListing {
  id: number;
  title: string;
  listingType: ListingKind;
  price: number;
  currencyCode: string;
  propertyType: PropertyType;
  cityName: string;
  mainImageUrl: string | null;
}