import { Injectable, signal } from '@angular/core';
import { FurnishedStatus, HeatingType, PropertyCondition, PropertyType } from '../property.models';
import { MAX_PHOTOS, photoKey } from './shared/photo-rules';

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
  propertyId: number | null;
}

export interface DraftPhoto {
  id: string;
  file: File;
  url: string;
  key: string;
}

const EMPTY_DRAFT: PropertyDraft = {
  propertyType: null, address: '', description: '',
  cityId: null, latitude: null, longitude: null,
  areaM2: null, plotAreaM2: null, rooms: null, bathrooms: null,
  floor: null, totalFloors: null, yearBuilt: null,
  heatingType: null, furnishedStatus: null, condition: null,
  amenityIds: [],
  propertyId: null,
};

let photoSeq = 0;

@Injectable({ providedIn: 'root' })
export class PropertyDraftService {
  private readonly draftSignal = signal<PropertyDraft>({ ...EMPTY_DRAFT });
  private readonly completedSignal = signal<number[]>([]);
  private readonly photosSignal = signal<DraftPhoto[]>([]);

  readonly draft = this.draftSignal.asReadonly();
  readonly completed = this.completedSignal.asReadonly();
  readonly photos = this.photosSignal.asReadonly();

  constructor() {
    this.restore();
  }

  patch(changes: Partial<PropertyDraft>): void {
    const typeChanged =
      'propertyType' in changes && changes.propertyType !== this.draftSignal().propertyType;

    this.draftSignal.update((d) => ({ ...d, ...changes }));

    if (typeChanged) this.completedSignal.update((c) => c.filter((i) => i < 2));

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

  addPhotos(files: File[]): void {
    const room = Math.max(0, MAX_PHOTOS - this.photosSignal().length);
    const added: DraftPhoto[] = files.slice(0, room).map((file) => ({
      id: `photo-${++photoSeq}`,
      file,
      url: URL.createObjectURL(file),
      key: photoKey(file),
    }));
    if (added.length) this.photosSignal.update((list) => [...list, ...added]);
  }

  removePhoto(id: string): void {
    const photo = this.photosSignal().find((p) => p.id === id);
    if (!photo) return;
    URL.revokeObjectURL(photo.url);
    this.photosSignal.update((list) => list.filter((p) => p.id !== id));
  }

  makeMain(id: string): void {
    this.photosSignal.update((list) => {
      const i = list.findIndex((p) => p.id === id);
      if (i <= 0) return list;
      return [list[i], ...list.slice(0, i), ...list.slice(i + 1)];
    });
  }

  movePhoto(id: string, direction: -1 | 1): void {
    this.photosSignal.update((list) => {
      const i = list.findIndex((p) => p.id === id);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  clearPhotos(): void {
    this.photosSignal().forEach((p) => URL.revokeObjectURL(p.url));
    this.photosSignal.set([]);
  }

  reset(): void {
    this.draftSignal.set({ ...EMPTY_DRAFT });
    this.completedSignal.set([]);
    this.clearPhotos();
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