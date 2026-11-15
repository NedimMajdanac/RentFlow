import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

export interface City {
  id: number;
  name: string;
  region: string | null;
}

@Injectable({ providedIn: 'root' })
export class CityService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<City[]> {
    return this.http.get<City[]>(`${environment.apiUrl}/api/cities`);
  }
}