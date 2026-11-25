import { Component, ElementRef, HostListener, ViewChild, computed, inject, input, output, signal } from '@angular/core';

export interface AmenityOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-amenity-picker',
  standalone: true,
  template: `
    <div class="ms">
      <button type="button" class="ms__btn" #btn [id]="inputId()" aria-haspopup="true"
              [attr.aria-expanded]="open()" [attr.aria-invalid]="invalid() ? true : null"
              [class.ms__btn--invalid]="invalid()" (click)="open.set(!open())">
        <span [class.ms__placeholder]="!selected().length">{{ summary() }}</span>
        <svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true">
          <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      @if (open()) {
        <div class="ms__panel" role="group" aria-label="Pogodnosti">
          @if (loadFailed() && !options().length) {
            <p class="ms__msg">
              Pogodnosti se nisu učitale.
              <button type="button" class="text-btn" (click)="retry.emit()">Pokušaj ponovo</button>
            </p>
          } @else if (!options().length) {
            <p class="ms__msg">Učitavanje...</p>
          } @else {
            @for (a of options(); track a.id) {
              <label class="ms__opt">
                <input type="checkbox" [checked]="isOn(a.id)" (change)="toggle(a.id)" />
                <span>{{ a.name }}</span>
              </label>
            }
          }
        </div>
      }
    </div>

    @if (chosen().length) {
      <ul class="chips" aria-label="Odabrane pogodnosti">
        @for (a of chosen(); track a.id) {
          <li class="chip">
            {{ a.name }}
            <button type="button" (click)="toggle(a.id)" [attr.aria-label]="'Ukloni ' + a.name">×</button>
          </li>
        }
        <li><button type="button" class="text-btn" (click)="clear()">Ukloni sve</button></li>
      </ul>
    }
  `,
  styles: `
    :host { display: block; color: #14213d; }
    .ms { position: relative; }
    .ms__btn {
      display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; height: 44px; padding: 0 14px;
      border: 1px solid #e3e8f3; border-radius: 6px; background: #fff; color: #14213d; font: inherit; font-size: 15px; text-align: left; cursor: pointer;
    }
    .ms__btn:focus-visible, .ms__btn[aria-expanded='true'] { border-color: #2158d8; box-shadow: 0 0 0 3px rgba(33, 88, 216, .12); outline: none; }
    .ms__btn--invalid { border-color: #d93025; }
    .ms__placeholder { color: #8a97b3; }
    .ms__panel {
      position: absolute; z-index: 20; top: calc(100% + 6px); left: 0; right: 0; max-height: 280px; overflow-y: auto; padding: 8px;
      border: 1px solid #e3e8f3; border-radius: 10px; background: #fff; box-shadow: 0 12px 32px rgba(15, 29, 59, .14);
    }
    .ms__opt { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; font-size: 15px; cursor: pointer; }
    .ms__opt:hover { background: #f4f7fd; }
    .ms__opt input { width: 18px; height: 18px; flex: none; accent-color: #2158d8; cursor: pointer; }
    .ms__msg { margin: 0; padding: 12px; color: #5d6b8a; font-size: 14px; }
    .chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 14px 0 0; padding: 0; list-style: none; }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 8px 6px 14px; border-radius: 999px; background: #e9f0fd; color: #1b47b0; font-size: 14px; font-weight: 500; }
    .chip button { display: grid; place-items: center; width: 22px; height: 22px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: inherit; font-size: 18px; line-height: 1; cursor: pointer; }
    .chip button:hover { background: rgba(33, 88, 216, .15); }
    .text-btn { padding: 0; border: 0; background: none; color: #2158d8; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
    .text-btn:hover { text-decoration: underline; }
  `,
})
export class AmenityPickerComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly options = input.required<AmenityOption[]>();
  readonly selected = input.required<number[]>();
  readonly loadFailed = input(false);
  readonly invalid = input(false);
  readonly inputId = input('amenity-picker');

  readonly selectedChange = output<number[]>();
  readonly retry = output<void>();

  readonly open = signal(false);
  @ViewChild('btn') private btn?: ElementRef<HTMLButtonElement>;

  readonly chosen = computed(() => {
    const ids = new Set(this.selected());
    return this.options().filter((a) => ids.has(a.id));
  });
  readonly summary = computed(() => {
    const n = this.selected().length;
    return n === 0 ? 'Odaberite pogodnosti nekretnine' : `Odabrano pogodnosti: ${n}`;
  });

  isOn(id: number): boolean {
    return this.selected().includes(id);
  }

  toggle(id: number): void {
    const ids = this.selected();
    this.selectedChange.emit(ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]);
  }

  clear(): void {
    this.selectedChange.emit([]);
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('keydown.escape')
  closeOnEscape(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.btn?.nativeElement.focus();
  }
}