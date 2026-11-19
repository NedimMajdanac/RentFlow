import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { PropertyRequest } from './property.models';

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/properties`;

  create(body: PropertyRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, body);
  }

  update(id: number, body: PropertyRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }
}