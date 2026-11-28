import { ListingStatus } from '../listings/listing.models';
import { ListingKind, PropertyType } from '../properties/property.models';

export type RequestStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  Pending: 'Na čekanju',
  Accepted: 'Prihvaćen',
  Rejected: 'Odbijen',
  Cancelled: 'Otkazan',
};

export const REQUEST_STATUS_HINTS: Record<RequestStatus, string> = {
  Pending: 'Čeka odgovor vlasnika',
  Accepted: 'Vlasnik je prihvatio zahtjev',
  Rejected: 'Vlasnik je odbio zahtjev',
  Cancelled: 'Zahtjev je otkazan',
};

export const REQUEST_STATUS_OPTIONS = (Object.keys(REQUEST_STATUS_LABELS) as RequestStatus[]).map((value) => ({
  value,
  label: REQUEST_STATUS_LABELS[value],
}));

export interface CreateRequestBody {
  listingId: number;
  message: string | null;
  desiredStartDate: string | null;
  desiredEndDate: string | null;
}

export interface CreateRequestResult {
  id: number;
  status: RequestStatus;
  listingType: ListingKind;
  createdAtUtc: string;
}

export interface RequestListing {
  id: number;
  title: string;
  listingType: ListingKind;
  status: ListingStatus;
  price: number;
  currencyCode: string;
  propertyType: PropertyType;
  cityName: string;
  mainImageUrl: string | null;
}

export interface MyRequest {
  id: number;
  status: RequestStatus;
  message: string | null;
  desiredStartDate: string | null;
  desiredEndDate: string | null;
  createdAtUtc: string;
  respondedAtUtc: string | null;
  canCancel: boolean;
  contractId: number | null;
  ownerName: string;
  listing: RequestListing;
}

export interface MyRequestsQuery {
  status: RequestStatus | '';
  listingType: ListingKind | '';
  pageNumber: number;
  pageSize: number;
}