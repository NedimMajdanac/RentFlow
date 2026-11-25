import { Injectable, signal } from '@angular/core';
import { FurnishedStatus, HeatingType, ListingKind, PropertyCondition, PropertyType } from '../property.models';
import { MAX_PHOTOS, photoKey } from './shared/photo-rules';

const STORAGE_KEY = 'rentflow.propertyDraft';

export interface PropertyDraft {
  // step 1
  propertyType: PropertyType | null;
  address: string;
  description: string;
  // step 2
  cityId: number | null;
  latitude: number | null;
  longitude: number | null;
  // steps 3 and 4
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
  // step 6 (listing)
  listingType: ListingKind | null;
  title: string;
  price: number | null;
  currencyId: number | null;
  isNegotiable: boolean;
  deposit: number | null;
  /** Set once the property exists on the server; from then on the publish step updates instead of creating. */
  propertyId: number | null;
}

/** A photo picked in step 5. Files live in memory only (they cannot be stored in sessionStorage). */
export interface DraftPhoto {
  id: string;
  file: File;
  url: string;          // blob: URL used for the preview
  key: string;
  remoteId: number | null; // image id on the server once uploaded
}

const EMPTY_DRAFT: PropertyDraft = {
  propertyType: null, address: '', description: '',
  cityId: null, latitude: null, longitude: null,
  areaM2: null, plotAreaM2: null, rooms: null, bathrooms: null,
  floor: null, totalFloors: null, yearBuilt: null,
  heatingType: null, furnishedStatus: null, condition: null,
  amenityIds: [],
  listingType: null, title: '', price: null, currencyId: null, isNegotiable: false, deposit: null,
  propertyId: null,
};

let photoSeq = 0;

@Injectable({ providedIn: 'root' })
export class PropertyDraftService {
  private readonly draftSignal = signal<PropertyDraft>({ ...EMPTY_DRAFT });
  private readonly completedSignal = signal<number[]>([]);
  private readonly photosSignal = signal<DraftPhoto[]>([]);
  private readonly pendingDeletesSignal = signal<number[]>([]);

  readonly draft = this.draftSignal.asReadonly();
  /** Indexes of completed steps (0 = first step). */
  readonly completed = this.completedSignal.asReadonly();
  /** Photos in upload order; the first one is the main photo. */
  readonly photos = this.photosSignal.asReadonly();
  /** Server-side images the user removed after they had been uploaded; deleted on the next publish attempt. */
  readonly pendingImageDeletes = this.pendingDeletesSignal.asReadonly();

  constructor() {
    this.restore();
  }

  patch(changes: Partial<PropertyDraft>): void {
    const typeChanged =
      'propertyType' in changes && changes.propertyType !== this.draftSignal().propertyType;

    this.draftSignal.update((d) => ({ ...d, ...changes }));

    // A different property type changes the rules of steps 3+, so they must be confirmed again.
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
      remoteId: null,
    }));
    if (added.length) this.photosSignal.update((list) => [...list, ...added]);
  }

  removePhoto(id: string): void {
    const photo = this.photosSignal().find((p) => p.id === id);
    if (!photo) return;

    URL.revokeObjectURL(photo.url);
    if (photo.remoteId !== null) this.queueRemoteDelete([photo.remoteId]);
    this.photosSignal.update((list) => list.filter((p) => p.id !== id));
  }

  /** Moves the photo to the front; the first photo is the main one. */
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
    const uploaded = this.photosSignal()
      .map((p) => p.remoteId)
      .filter((id): id is number => id !== null);
    if (uploaded.length) this.queueRemoteDelete(uploaded);

    this.photosSignal().forEach((p) => URL.revokeObjectURL(p.url));
    this.photosSignal.set([]);
  }

  markPhotoUploaded(id: string, remoteId: number): void {
    this.photosSignal.update((list) => list.map((p) => (p.id === id ? { ...p, remoteId } : p)));
  }

  clearPendingDelete(remoteId: number): void {
    this.pendingDeletesSignal.update((list) => list.filter((i) => i !== remoteId));
  }

  /** Forget everything that was uploaded (the property no longer exists on the server). */
  resetUploads(): void {
    this.photosSignal.update((list) => list.map((p) => ({ ...p, remoteId: null })));
    this.pendingDeletesSignal.set([]);
  }

  /** Called when starting a new property, after a successful publish and on logout. */
  reset(): void {
    this.draftSignal.set({ ...EMPTY_DRAFT });
    this.completedSignal.set([]);
    this.clearPhotos();
    this.pendingDeletesSignal.set([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  private queueRemoteDelete(ids: number[]): void {
    this.pendingDeletesSignal.update((list) => [...list, ...ids]);
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