import { Injectable, signal } from '@angular/core';
import { FurnishedStatus, HeatingType, PropertyCondition, PropertyType } from '../property.models';

const STORAGE_KEY = 'rentflow.propertyDraft';

export interface PropertyDraft {
  propertyType: PropertyType | null;
  address: string;
  description: string;
  cityId: number | null;
  latitude: number | null;
  longitude: number | null;
  areaM2: number | null;
  plotAreaM2: number | null;
  rooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  yearBuilt: number | null;
  heatingType: HeatingType | null;
  furnishedStatus: FurnishedStatus | null;
  condition: PropertyCondition | null;
  amenityIds: number[];
}

const EMPTY_DRAFT: PropertyDraft = {
  propertyType: null, address: '', description: '',
  cityId: null, latitude: null, longitude: null,
  areaM2: null, plotAreaM2: null, rooms: null, bathrooms: null,
  floor: null, totalFloors: null, yearBuilt: null,
  heatingType: null, furnishedStatus: null, condition: null,
  amenityIds: [],
};

@Injectable({ providedIn: 'root' })
export class PropertyDraftService {
  private readonly draftSignal = signal<PropertyDraft>({ ...EMPTY_DRAFT });
  private readonly completedSignal = signal<number[]>([]);

  readonly draft = this.draftSignal.asReadonly();
  readonly completed = this.completedSignal.asReadonly();

  constructor() {
    this.restore();
  }

  patch(changes: Partial<PropertyDraft>): void {
    this.draftSignal.update((d) => ({ ...d, ...changes }));
    this.persist();
  }

  markCompleted(index: number): void {
    if (this.completedSignal().includes(index)) return;
    this.completedSignal.update((c) => [...c, index]);
    this.persist();
  }

  unmarkCompleted(index: number): void {
    if (!this.completedSignal().includes(index)) return;
    this.completedSignal.update((c) => c.filter((i) => i !== index));
    this.persist();
  }

  isCompleted(index: number): boolean {
    return this.completedSignal().includes(index);
  }

  reset(): void {
    this.draftSignal.set({ ...EMPTY_DRAFT });
    this.completedSignal.set([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  private persist(): void {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ draft: this.draftSignal(), completed: this.completedSignal() }),
      );
    } catch {}
  }

  private restore(): void {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw);
      this.draftSignal.set({ ...EMPTY_DRAFT, ...stored.draft });
      this.completedSignal.set(Array.isArray(stored.completed) ? stored.completed : []);
    } catch {}
  }
}