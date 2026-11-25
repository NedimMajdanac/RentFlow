import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

export interface Currency {
  id: number;
  code: string;
  name: string | null;
}

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Currency[]> {
    return this.http.get<Currency[]>(`${environment.apiUrl}/api/currencies`);
  }
}