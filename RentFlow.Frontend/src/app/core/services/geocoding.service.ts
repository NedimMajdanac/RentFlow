import { Injectable } from '@angular/core';

const BASE = 'https://nominatim.openstreetmap.org';

export interface ReverseResult {
  address: string;            
  cityCandidates: string[];   
  countryCode: string | null;
}

export interface ForwardResult {
  lat: number;
  lng: number;
  hasHouseNumber: boolean;
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  async reverse(lat: number, lng: number, signal: AbortSignal): Promise<ReverseResult | null> {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(lat),
      lon: String(lng),
      zoom: '18',
      addressdetails: '1',
      'accept-language': 'bs',
    });

    const data = await this.get(`${BASE}/reverse?${params}`, signal);
    if (!data || data.error) return null;

    const a = data.address ?? {};
    const street: string = a.road ?? a.pedestrian ?? a.footway ?? a.path ?? '';

    return {
      address: street ? [street, a.house_number].filter(Boolean).join(' ') : '',
      cityCandidates: [a.city, a.town, a.village, a.municipality, a.city_district, a.suburb].filter(Boolean),
      countryCode: a.country_code ?? null,
    };
  }

  async search(query: string, signal: AbortSignal): Promise<ForwardResult | null> {
    const params = new URLSearchParams({
      format: 'jsonv2',
      q: query,
      limit: '1',
      countrycodes: 'ba',
      addressdetails: '1',
      'accept-language': 'bs',
    });

    const list = await this.get(`${BASE}/search?${params}`, signal);
    const first = Array.isArray(list) ? list[0] : null;
    if (!first) return null;

    return {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      hasHouseNumber: !!first.address?.house_number,
    };
  }

  private async get(url: string, signal: AbortSignal): Promise<any> {
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Geocoding ${res.status}`);
    return res.json();
  }
}