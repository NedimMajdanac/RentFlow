import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { ListingRequest, PagedResult } from '../../properties/property.models';
import { BrowseListing, BrowseQuery, ListingDetails } from '../listing.models';

@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/listings`;

  create(body: ListingRequest): Observable<{ id: number; status: string }> {
    return this.http.post<{ id: number; status: string }>(this.base, body);
  }

  browse(q: BrowseQuery): Observable<PagedResult<BrowseListing>> {
    let params = new HttpParams()
      .set('pageNumber', q.pageNumber)
      .set('pageSize', q.pageSize)
      .set('sort', q.sort);

    if (q.search) params = params.set('search', q.search);
    if (q.listingType) params = params.set('listingType', q.listingType);
    if (q.propertyType) params = params.set('propertyType', q.propertyType);
    if (q.cityId !== null) params = params.set('cityId', q.cityId);
    if (q.currencyId !== null) params = params.set('currencyId', q.currencyId);
    if (q.minPrice !== null) params = params.set('minPrice', q.minPrice);
    if (q.maxPrice !== null) params = params.set('maxPrice', q.maxPrice);
    if (q.minRooms !== null) params = params.set('minRooms', q.minRooms);
    if (q.minAreaM2 !== null) params = params.set('minAreaM2', q.minAreaM2);
    if (q.maxAreaM2 !== null) params = params.set('maxAreaM2', q.maxAreaM2);
    for (const id of q.amenityIds) params = params.append('amenityIds', id); // repeated key binds to List<int>

    return this.http.get<PagedResult<BrowseListing>>(this.base, { params });
  }

  addFavorite(id: number): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/favorite`, {});
  }

  removeFavorite(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/favorite`);
  }

  getById(id: number): Observable<ListingDetails> {
  return this.http.get<ListingDetails>(`${this.base}/${id}`);
}
}