import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

export interface Amenity {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class AmenityService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Amenity[]> {
    return this.http.get<Amenity[]>(`${environment.apiUrl}/api/amenities`);
  }
}