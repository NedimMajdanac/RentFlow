import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PropertyDraftService } from '../../property-draft.service';
import { WIZARD_BASE, WIZARD_STEPS } from '../../property-wizard.config';
import { MAX_PHOTOS, MAX_PHOTO_BYTES, PHOTO_TYPES, looksLikeImage, photoKey } from '../../shared/photo-rules';
import { WizardStepComponent } from '../../shared/wizard-step.component';

@Component({
  selector: 'app-property-step-photos',
  standalone: true,
  imports: [WizardStepComponent],
  templateUrl: './property-step-photos.component.html',
  styleUrls: ['../../shared/wizard-form.css', './property-step-photos.component.css'],
})
export class PropertyStepPhotosComponent {
  private readonly router = inject(Router);
  private readonly draft = inject(PropertyDraftService);

  readonly photos = this.draft.photos;
  readonly maxPhotos = MAX_PHOTOS;
  readonly accept = PHOTO_TYPES.join(',');

  readonly dragging = signal(false);
  readonly checking = signal(false);
  readonly errors = signal<string[]>([]);
  readonly canAddMore = computed(() => this.photos().length < MAX_PHOTOS);

  async onPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = ''; 
    await this.addFiles(files);
  }

  onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault(); 
    event.dataTransfer.dropEffect = this.canAddMore() ? 'copy' : 'none';
    this.dragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    const zone = event.currentTarget as HTMLElement;
    if (!zone.contains(event.relatedTarget as Node | null)) this.dragging.set(false);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging.set(false);
    await this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  private async addFiles(files: File[]): Promise<void> {
    if (!files.length) return;

    this.checking.set(true);
    const errors: string[] = [];
    const accepted: File[] = [];
    const known = new Set(this.photos().map((p) => p.key));
    const room = MAX_PHOTOS - this.photos().length;
    let overflow = false;

    for (const file of files) {
      if (!PHOTO_TYPES.includes(file.type)) {
        errors.push(`„${file.name}“: dozvoljeni formati su JPG, PNG i WebP.`);
      } else if (file.size === 0) {
        errors.push(`„${file.name}“: fajl je prazan.`);
      } else if (file.size > MAX_PHOTO_BYTES) {
        errors.push(`„${file.name}“: slika može imati najviše 5 MB.`);
      } else if (known.has(photoKey(file))) {
        errors.push(`„${file.name}“ je već dodana.`);
      } else if (accepted.length >= room) {
        overflow = true;
      } else if (!(await looksLikeImage(file))) {
        errors.push(`„${file.name}“ nije ispravna slika.`);
      } else {
        accepted.push(file);
        known.add(photoKey(file));
      }
    }

    if (overflow) errors.push(`Najviše ${MAX_PHOTOS} fotografija. Preostale nisu dodane.`);

    this.draft.addPhotos(accepted);
    this.errors.set(errors);
    this.checking.set(false);
  }

  makeMain(id: string): void {
    this.draft.makeMain(id);
  }

  move(id: string, direction: -1 | 1): void {
    this.draft.movePhoto(id, direction);
  }

  remove(id: string): void {
    this.draft.removePhoto(id);
    this.errors.set([]);
  }

  clearAll(): void {
    this.draft.clearPhotos();
    this.errors.set([]);
  }

  next(): void {
    this.draft.markCompleted(4);
    this.router.navigate([WIZARD_BASE, WIZARD_STEPS[5].path]);
  }
}