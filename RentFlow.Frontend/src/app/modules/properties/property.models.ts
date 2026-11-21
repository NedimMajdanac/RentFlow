export type PropertyType = 'Apartment' | 'House' | 'Commercial' | 'Land' | 'Garage' | 'Other';
export type HeatingType = 'Central' | 'Gas' | 'Electric' | 'Wood' | 'HeatPump' | 'None';
export type FurnishedStatus = 'Furnished' | 'Partly' | 'Unfurnished';
export type PropertyCondition = 'NewBuild' | 'Renovated' | 'Good' | 'NeedsRenovation';

export const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: 'Apartment', label: 'Stan' },
  { value: 'House', label: 'Kuća' },
  { value: 'Commercial', label: 'Poslovni prostor' },
  { value: 'Land', label: 'Zemljište' },
  { value: 'Garage', label: 'Garaža' },
  { value: 'Other', label: 'Ostalo' },
];

export const HEATING_OPTIONS: { value: HeatingType; label: string }[] = [
  { value: 'Central', label: 'Centralno grijanje' },
  { value: 'Gas', label: 'Plin' },
  { value: 'Electric', label: 'Struja' },
  { value: 'Wood', label: 'Drva / čvrsto gorivo' },
  { value: 'HeatPump', label: 'Toplotna pumpa' },
  { value: 'None', label: 'Bez grijanja' },
];

export const FURNISHED_OPTIONS: { value: FurnishedStatus; label: string }[] = [
  { value: 'Furnished', label: 'Namješteno' },
  { value: 'Partly', label: 'Djelimično namješteno' },
  { value: 'Unfurnished', label: 'Nenamješteno' },
];

export const CONDITION_OPTIONS: { value: PropertyCondition; label: string }[] = [
  { value: 'NewBuild', label: 'Novogradnja' },
  { value: 'Renovated', label: 'Renovirano' },
  { value: 'Good', label: 'Dobro stanje' },
  { value: 'NeedsRenovation', label: 'Potrebna renovacija' },
];

export interface PropertyRequest {
  cityId: number;
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
  amenityIds: number[];
}

export type PropertyStatus = 'NoListing' | 'InPreparation' | 'Available' | 'Reserved' | 'Rented' | 'Sold';
export type ListingKind = 'Rent' | 'Sale';
export type PropertySort = 'Newest' | 'Oldest' | 'Title';

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  NoListing: 'Bez oglasa',
  InPreparation: 'U pripremi',
  Available: 'Slobodno',
  Reserved: 'Rezervisano',
  Rented: 'Iznajmljeno',
  Sold: 'Prodano',
};

export const PROPERTY_STATUS_OPTIONS = (Object.keys(PROPERTY_STATUS_LABELS) as PropertyStatus[]).map((value) => ({
  value,
  label: PROPERTY_STATUS_LABELS[value],
}));

export const SORT_OPTIONS: { value: PropertySort; label: string }[] = [
  { value: 'Newest', label: 'Najnovije dodano' },
  { value: 'Oldest', label: 'Najstarije dodano' },
  { value: 'Title', label: 'Naziv A–Ž' },
];

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface PropertyListItem {
  id: number;
  title: string;
  address: string;
  cityId: number;
  cityName: string;
  propertyType: PropertyType;
  areaM2: number;
  rooms: number | null;
  mainImageUrl: string | null;
  createdAtUtc: string;
  status: PropertyStatus;
  listingType: ListingKind | null;
  price: number | null;
  currencyCode: string | null;
  tenantName: string | null;
}

export interface PropertySummary {
  totalCount: number;
  activeRentals: number;
  availableCount: number;
  expiringContracts: number;
}

export interface PropertyListQuery {
  search: string;
  propertyType: PropertyType | '';
  cityId: number | null;
  status: PropertyStatus | '';
  listingType: ListingKind | '';
  sort: PropertySort;
  pageNumber: number;
  pageSize: number;
}