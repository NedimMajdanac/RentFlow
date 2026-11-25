import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { PropertyImage, PropertyListItem, PropertyListQuery, PropertyRequest, PropertySummary } from './property.models';
import { PagedResult } from './property.models';
import { PropertyDetails, PropertyStats } from './property-edit.models';

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/properties`;

  list(q: PropertyListQuery): Observable<PagedResult<PropertyListItem>> {
    let params = new HttpParams()
      .set('pageNumber', q.pageNumber)
      .set('pageSize', q.pageSize)
      .set('sort', q.sort);

    if (q.search.trim()) params = params.set('search', q.search.trim());
    if (q.propertyType) params = params.set('propertyType', q.propertyType);
    if (q.cityId !== null) params = params.set('cityId', q.cityId);
    if (q.status) params = params.set('status', q.status);
    if (q.listingType) params = params.set('listingType', q.listingType);

    return this.http.get<PagedResult<PropertyListItem>>(`${this.base}/my`, { params });
  }

  summary(): Observable<PropertySummary> {
    return this.http.get<PropertySummary>(`${this.base}/my/summary`);
  }

  create(body: PropertyRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, body);
  }

  update(id: number, body: PropertyRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  uploadImage(propertyId: number, file: File): Observable<PropertyImage> {
    const form = new FormData();
    form.append('file', file); // field name must match the IFormFile parameter on the backend
    return this.http.post<PropertyImage>(`${this.base}/${propertyId}/images`, form);
  }

  deleteImage(propertyId: number, imageId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${propertyId}/images/${imageId}`);
  }

  setMainImage(propertyId: number, imageId: number): Observable<void> {
    return this.http.put<void>(`${this.base}/${propertyId}/images/${imageId}/main`, {});
  }

  /** The list must contain every image of the property exactly once, in the wanted order. */
  reorderImages(propertyId: number, imageIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.base}/${propertyId}/images/order`, { imageIds });
  }

  getById(id: number): Observable<PropertyDetails> {
    return this.http.get<PropertyDetails>(`${this.base}/${id}`);
  }

  stats(id: number): Observable<PropertyStats> {
    return this.http.get<PropertyStats>(`${this.base}/${id}/stats`);
  }
}