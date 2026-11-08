import { Observable, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { ImageKind, MyProfile, UpdateProfileRequest } from '../models/profile.models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly base = `${this.apiUrl}/api/profile`;

  getMe(): Observable<MyProfile> {
    return this.http.get<MyProfile>(`${this.base}/me`);
  }

  update(body: UpdateProfileRequest): Observable<{ isVerified: boolean }> {
    return this.http.put<{ isVerified: boolean }>(`${this.base}/me`, body);
  }

  uploadImage(kind: ImageKind, file: File): Observable<{ url: string }> {
    const form = new FormData();
    form.append('file', file); 
    const path = kind === 'profile' ? 'profile-image' : 'cover-image';
    return this.http.post<{ url: string }>(`${this.base}/me/${path}`, form);
  }

  mediaUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : `${this.apiUrl}${url}`;
    }

    getCities(): Observable<string[]> {
        return this.http
            .get<{ id: number; name: string; region: string | null }[]>(`${this.apiUrl}/api/cities`)
            .pipe(map((list) => list.map((c) => c.name)));
    }
}