import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, HostListener, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { extractFieldErrors } from '../../../core/http/api-error';
import { mediaUrl } from '../../../core/utils/media-url';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PropertyImage } from '../property.models';
import { PropertyService } from '../property.service';
import { MAX_PHOTOS, MAX_PHOTO_BYTES, PHOTO_TYPES, looksLikeImage } from '../wizard/shared/photo-rules';

/** The first image is always the main one: positions and the main flag are kept in sync. */
const normalize = (order: PropertyImage[]): PropertyImage[] =>
  order.map((img, i) => ({ ...img, sortOrder: i, isMain: i === 0 }));

@Component({
  selector: 'app-property-photos-dialog',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="overlay" (click)="close()">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="ph-title" (click)="$event.stopPropagation()">
        <header class="dialog__head">
          <div>
            <h2 id="ph-title">Fotografije</h2>
            <p>Izmjene fotografija se čuvaju odmah. Prva fotografija je naslovna.</p>
          </div>
          <button type="button" id="photos-close" class="x" aria-label="Zatvori" (click)="close()">
            <app-icon name="close" [size]="20" />
          </button>
        </header>

        <div class="bar">
          <input #file type="file" hidden multiple [accept]="accept" (change)="onPicked($event)" />
          <button type="button" class="btn" [disabled]="busy() || sorted().length >= maxPhotos" (click)="file.click()">
            <app-icon name="upload" [size]="18" /> {{ busy() ? 'Obrada...' : 'Dodaj fotografije' }}
          </button>
          <span class="count">{{ sorted().length }} / {{ maxPhotos }}</span>
          <span class="rules">JPG, PNG ili WebP · najviše 5 MB</span>
        </div>

        @if (messages().length) {
          <div class="alert" role="alert">@for (m of messages(); track m) { <p>{{ m }}</p> }</div>
        }

        @if (sorted().length) {
          <ul class="grid">
            @for (img of sorted(); track img.id; let i = $index) {
              <li class="card" [class.card--main]="i === 0">
                <div class="card__img">
                  <img [attr.src]="media(img.url)" [alt]="'Fotografija ' + (i + 1)" (error)="hideBroken($event)" />
                  @if (i === 0) { <span class="badge">Naslovna</span> }
                </div>

                <div class="card__bar">
                  @if (i === 0) {
                    <span class="muted">Naslovna fotografija</span>
                  } @else {
                    <button type="button" class="text-btn" [disabled]="busy()" (click)="makeMain(img)">Postavi kao naslovnu</button>
                  }

                  <div class="tools">
                    <button type="button" class="tool" [disabled]="busy() || i === 0" (click)="move(img, -1)"
                            [attr.aria-label]="'Pomjeri fotografiju ' + (i + 1) + ' ulijevo'">
                      <app-icon name="chevron-left" [size]="16" />
                    </button>
                    <button type="button" class="tool" [disabled]="busy() || i === sorted().length - 1" (click)="move(img, 1)"
                            [attr.aria-label]="'Pomjeri fotografiju ' + (i + 1) + ' udesno'">
                      <app-icon name="chevron-right" [size]="16" />
                    </button>

                    @if (confirmingId() === img.id) {
                      <button type="button" class="tool tool--yes" [disabled]="busy()" (click)="remove(img)">Obriši</button>
                      <button type="button" class="tool" (click)="confirmingId.set(null)">Ne</button>
                    } @else {
                      <button type="button" class="tool tool--danger" [disabled]="busy()" (click)="confirmingId.set(img.id)"
                              [attr.aria-label]="'Ukloni fotografiju ' + (i + 1)">
                        <app-icon name="trash" [size]="16" />
                      </button>
                    }
                  </div>
                </div>
              </li>
            }
          </ul>
        } @else {
          <p class="empty">Nekretnina još nema fotografija.</p>
        }

        <footer class="dialog__foot">
          <button type="button" class="btn btn--light" (click)="close()" [disabled]="busy()">Zatvori</button>
        </footer>
      </div>
    </div>
  `,
  styles: `
    :host { color: #14213d; font-family: Inter, 'Segoe UI', system-ui, sans-serif; }
    * { box-sizing: border-box; }
    p, h2, ul { margin: 0; }
    .overlay { position: fixed; inset: 0; z-index: 300; display: grid; place-items: center; padding: 24px; background: rgba(15, 29, 59, .55); overflow-y: auto; }
    .dialog { width: 100%; max-width: 860px; max-height: calc(100vh - 48px); display: flex; flex-direction: column; border-radius: 16px; background: #fff; box-shadow: 0 20px 60px rgba(0, 0, 0, .3); overflow: hidden; }
    .dialog__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 24px 28px 8px; }
    .dialog__head h2 { font-size: 22px; font-weight: 800; }
    .dialog__head p { margin-top: 4px; color: #5d6b8a; font-size: 14px; }
    .x { display: grid; place-items: center; width: 38px; height: 38px; border: 0; border-radius: 50%; background: #f1f4fa; color: #14213d; cursor: pointer; }
    .x:hover { background: #e3e8f3; }
    .bar { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; padding: 12px 28px; }
    .count { padding: 4px 12px; border-radius: 999px; background: #eef2f8; color: #5d6b8a; font-size: 13px; font-weight: 600; }
    .rules { color: #5d6b8a; font-size: 13px; }
    .alert { margin: 0 28px 8px; padding: 12px 16px; border-radius: 10px; background: #fdecea; color: #a1261b; font-size: 14px; }
    .alert p + p { margin-top: 4px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; padding: 8px 28px 20px; margin: 0; list-style: none; overflow-y: auto; }
    .card { overflow: hidden; border: 1px solid #e3e8f3; border-radius: 12px; background: #fff; }
    .card--main { border-color: #2158d8; box-shadow: 0 0 0 2px rgba(33, 88, 216, .15); }
    .card__img { position: relative; aspect-ratio: 4 / 3; background: linear-gradient(135deg, #b9cdf3, #5b7fc7); }
    .card__img img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .badge { position: absolute; top: 8px; left: 8px; padding: 4px 10px; border-radius: 999px; background: #2158d8; color: #fff; font-size: 12px; font-weight: 700; }
    .card__bar { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 8px 10px; flex-wrap: wrap; }
    .muted { color: #5d6b8a; font-size: 12px; }
    .tools { display: flex; gap: 4px; margin-left: auto; }
    .tool { display: grid; place-items: center; min-width: 30px; height: 30px; padding: 0 8px; border: 1px solid #e3e8f3; border-radius: 8px; background: #fff; color: #14213d; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
    .tool:hover:not(:disabled) { background: #f4f7fd; }
    .tool:disabled { opacity: .4; cursor: not-allowed; }
    .tool--danger { color: #d93025; }
    .tool--yes { border-color: #d93025; background: #d93025; color: #fff; }
    .tool--yes:hover:not(:disabled) { background: #b3261b !important; }
    .text-btn { padding: 0; border: 0; background: none; color: #2158d8; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; text-align: left; }
    .text-btn:hover:not(:disabled) { text-decoration: underline; }
    .text-btn:disabled { opacity: .5; cursor: not-allowed; }
    .empty { padding: 32px 28px; color: #5d6b8a; text-align: center; }
    .dialog__foot { display: flex; justify-content: flex-end; padding: 16px 28px 24px; border-top: 1px solid #e3e8f3; }
    .btn { display: inline-flex; align-items: center; gap: 8px; height: 42px; padding: 0 20px; border: 0; border-radius: 10px; background: #2158d8; color: #fff; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn:hover:not(:disabled) { background: #1b47b0; }
    .btn:disabled { opacity: .6; cursor: not-allowed; }
    .btn--light { border: 1px solid #e3e8f3; background: #fff; color: #14213d; }
    .btn--light:hover:not(:disabled) { background: #f4f7fd; }
    @media (max-width: 600px) { .overlay { padding: 8px; } .dialog__head, .bar, .grid, .dialog__foot { padding-left: 16px; padding-right: 16px; } .alert { margin-left: 16px; margin-right: 16px; } }
  `,
})
export class PropertyPhotosDialogComponent {
  private readonly api = inject(PropertyService);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly propertyId = input.required<number>();
  readonly images = input.required<PropertyImage[]>();

  /** Emits the new full list after every successful change. */
  readonly imagesChange = output<PropertyImage[]>();
  /** Asks the parent to reload the images from the server after a failed multi-step change. */
  readonly refresh = output<void>();
  readonly closed = output<void>();

  readonly maxPhotos = MAX_PHOTOS;
  readonly accept = PHOTO_TYPES.join(',');
  readonly busy = signal(false);
  readonly messages = signal<string[]>([]);
  readonly confirmingId = signal<number | null>(null);

  readonly sorted = computed(() => [...this.images()].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id));

  constructor() {
    this.document.body.style.overflow = 'hidden';
    afterNextRender(() => (this.host.nativeElement.querySelector('#photos-close') as HTMLElement | null)?.focus());
    inject(DestroyRef).onDestroy(() => (this.document.body.style.overflow = ''));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    if (!this.busy()) this.closed.emit();
  }

  media(url: string): string | null {
    return mediaUrl(url);
  }

  hideBroken(event: Event): void {
    (event.target as HTMLElement).style.visibility = 'hidden';
  }

  // ---------- upload ----------
  async onPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = ''; // allows picking the same file again
    if (!files.length || this.busy()) return;

    this.busy.set(true);
    this.messages.set([]);
    const problems: string[] = [];
    let current = [...this.sorted()];

    try {
      for (const file of files) {
        if (current.length >= MAX_PHOTOS) {
          problems.push(`Najviše ${MAX_PHOTOS} fotografija. Preostale nisu dodane.`);
          break;
        }
        const invalid = await this.validate(file);
        if (invalid) {
          problems.push(`„${file.name}“: ${invalid}`);
          continue;
        }

        const image = await firstValueFrom(this.api.uploadImage(this.propertyId(), file));
        current = [...current, image];
        this.imagesChange.emit(current);
      }
    } catch (err) {
      problems.push(this.messageFor(err));
      this.refresh.emit();
    } finally {
      this.messages.set(problems);
      this.busy.set(false);
    }
  }

  private async validate(file: File): Promise<string | null> {
    if (!PHOTO_TYPES.includes(file.type)) return 'dozvoljeni formati su JPG, PNG i WebP.';
    if (file.size === 0) return 'fajl je prazan.';
    if (file.size > MAX_PHOTO_BYTES) return 'slika može imati najviše 5 MB.';
    if (!(await looksLikeImage(file))) return 'nije ispravna slika.';
    return null;
  }

  // ---------- main image, order, delete ----------
  makeMain(img: PropertyImage): void {
    const order = [img, ...this.sorted().filter((i) => i.id !== img.id)];
    void this.run(async () => {
      await firstValueFrom(this.api.reorderImages(this.propertyId(), order.map((i) => i.id)));
      await firstValueFrom(this.api.setMainImage(this.propertyId(), img.id));
      this.imagesChange.emit(normalize(order));
    });
  }

  move(img: PropertyImage, direction: -1 | 1): void {
    const before = this.sorted();
    const from = before.findIndex((i) => i.id === img.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= before.length) return;

    const order = [...before];
    [order[from], order[to]] = [order[to], order[from]];

    void this.run(async () => {
      await firstValueFrom(this.api.reorderImages(this.propertyId(), order.map((i) => i.id)));
      // the first image is the main one, so a new first image must be marked as main too
      if (order[0].id !== before[0].id) await firstValueFrom(this.api.setMainImage(this.propertyId(), order[0].id));
      this.imagesChange.emit(normalize(order));
    });
  }

  remove(img: PropertyImage): void {
    this.confirmingId.set(null);
    void this.run(async () => {
      await firstValueFrom(this.api.deleteImage(this.propertyId(), img.id));
      // when the main image is removed, the backend promotes the next one
      const rest = this.sorted().filter((i) => i.id !== img.id);
      this.imagesChange.emit(rest.map((i, idx) => ({ ...i, isMain: idx === 0 })));
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.messages.set([]);
    try {
      await action();
    } catch (err) {
      this.messages.set([this.messageFor(err)]);
      this.refresh.emit(); // a multi-step change may have been applied only partly
    } finally {
      this.busy.set(false);
    }
  }

  private messageFor(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) return 'Došlo je do neočekivane greške.';
    if (err.status === 0) return 'Server nije dostupan. Pokušajte ponovo.';
    if (err.status === 404) return 'Fotografija ili nekretnina više ne postoji.';
    return Object.values(extractFieldErrors(err)).flat()[0] ?? 'Izmjena nije uspjela. Pokušajte ponovo.';
  }
}