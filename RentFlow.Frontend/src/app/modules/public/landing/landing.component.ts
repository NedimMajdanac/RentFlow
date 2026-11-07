import { Component, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Feature {
  number: string;
  label: string;
  title: [string, string];
  text: string;
  checks: string[];
  media: 'estate' | 'app' | 'payments';
  reverse: boolean;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent {
  private readonly document = inject(DOCUMENT);

  readonly year = new Date().getFullYear();

  readonly features: Feature[] = [
    {
      number: '01',
      label: 'NEKRETNINE',
      title: ['Vaše nekretnine,', 'uvijek pod kontrolom.'],
      text: 'Čuvajte ključne informacije o stanovima, kućama i apartmanima na jednom mjestu. Brzo pronađite podatke i jasno pratite status svake nekretnine.',
      checks: ['Pregled svih nekretnina', 'Status i detalji na jednom mjestu'],
      media: 'estate',
      reverse: false,
    },
    {
      number: '02',
      label: 'NAJAMI I UGOVORI',
      title: ['Najam i ugovori.', 'Jasno od početka.'],
      text: 'Povežite nekretninu s najmoprimcem, zabilježite uslove najma i pripremite PDF ugovor bez traženja podataka na više mjesta.',
      checks: ['Pregled aktivnih najmova i rokova', 'PDF ugovor vezan za najam'],
      media: 'app',
      reverse: true,
    },
    {
      number: '03',
      label: 'UPLATE I EVIDENCIJA',
      title: ['Svaka uplata', 'uredno evidentirana.'],
      text: 'Pratite plaćanja, evidentirajte iznose u različitim valutama i sačuvajte korišteni kurs za svaku transakciju. Povrat i promjene valute ostaju zabilježeni.',
      checks: ['Pregled plaćenih i očekivanih uplata', 'Valuta, kurs i povrat u evidenciji'],
      media: 'payments',
      reverse: false,
    },
  ];

  readonly pills = ['Pregled nekretnina', 'Ugovori u PDF-u', 'Evidencija uplata'];

  scrollTo(id: string, event: Event): void {
    event.preventDefault();
    this.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}