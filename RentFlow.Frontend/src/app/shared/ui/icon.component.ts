import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** 24x24 stroke icons, each one a single SVG path string (circles are written as arcs). */
const ICONS: Record<string, string> = {
    pin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7 M16 6l-4-4-4 4 M12 2v13',
    heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
    area: 'M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7',
    rooms: 'M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17 M3 21h18 M14 12h.01',
    floor: 'M12 2l10 5-10 5L2 7z M2 17l10 5 10-5 M2 12l10 5 10-5',
    bath: 'M4 12h16a1 1 0 0 1 1 1v2a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-2a1 1 0 0 1 1-1z M6 12V5a2 2 0 0 1 2-2h1 M7 19l-1 2 M17 19l1 2',
    'chevron-left': 'M15 6l-6 6 6 6',
    'chevron-right': 'M9 6l6 6-6 6',
    'arrow-right': 'M5 12h14 M13 6l6 6-6 6',
    close: 'M6 6l12 12 M18 6L6 18',
    check: 'M5 12l5 5 9-10',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
    'shield-check': 'M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6z M9 12l2 2 4-4',
    image: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M3 16l5-5 4 4 3-3 6 6 M9 9.5h.01',
    // amenities
    parking: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 17V7h4a3 3 0 0 1 0 6H9',
    garage: 'M3 21V9l9-6 9 6v12 M7 21v-7h10v7 M7 17h10',
    balcony: 'M3 21h18 M5 21V11 M19 21V11 M3 11h18 M9 11v10 M15 11v10',
    lift: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 10l3-3 3 3 M9 14l3 3 3-3',
    storage: 'M21 8l-9-5-9 5v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8',
    ac: 'M4 5h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M7 9h10 M7 17c0 1.5-1 2-1 3 M12 17v4 M17 17c0 1.5 1 2 1 3',
    wifi: 'M5 12.5a10 10 0 0 1 14 0 M8.5 16a5 5 0 0 1 7 0 M12 20h.01 M2 9a15 15 0 0 1 20 0',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0',
    garden: 'M12 22v-9 M12 13c-4 0-7-3-7-8 5 0 7 3 7 8z M12 13c4 0 7-3 7-8-5 0-7 3-7 8z',
    tv: 'M3 7h18v12H3z M8 3l4 4 4-4',
    edit: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
    trash: 'M3 6h18 M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6',
    upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
    plus: 'M12 5v14 M5 12h14',
};

/** Picks an icon for an amenity by its name (diacritics and case are ignored). Unknown names get a check mark. */
export function amenityIconName(name: string): string {
  const n = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

  const rules: [string, string][] = [
    ['parking', 'parking'], ['garaz', 'garage'], ['balkon', 'balcony'], ['terasa', 'balcony'],
    ['lift', 'lift'], ['podrum', 'storage'], ['ostava', 'storage'], ['klima', 'ac'],
    ['internet', 'wifi'], ['interfon', 'bell'], ['vrt', 'garden'], ['kablovska', 'tv'],
    ['alarm', 'shield-check'], ['ljubimci', 'heart'],
  ];
  return rules.find(([key]) => n.includes(key))?.[1] ?? 'check';
}

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24"
         [attr.fill]="filled() ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `:host { display: inline-flex; flex: none; }`,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(18);
  readonly filled = input(false);
  readonly path = computed(() => ICONS[this.name()] ?? ICONS['check']);
}