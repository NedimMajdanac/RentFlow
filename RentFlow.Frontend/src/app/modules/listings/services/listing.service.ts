import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ListingRequest } from '../../properties/property.models';
import { environment } from '../../../environments/environment.development';

@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/listings`;

  create(body: ListingRequest): Observable<{ id: number; status: string }> {
    return this.http.post<{ id: number; status: string }>(this.base, body);
  }
}