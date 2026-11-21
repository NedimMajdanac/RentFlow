export interface WizardStep {
  path: string;
  title: string;
  subtitle: string;
}

export const WIZARD_BASE = '/my-properties/new';

export const WIZARD_STEPS: WizardStep[] = [
  { path: 'basic-info', title: 'Osnovne informacije', subtitle: 'Unos osnovnih informacija o nekretnini' },
  { path: 'location', title: 'Lokacija', subtitle: 'Unesi grad i adresu' },
  { path: 'features', title: 'Karakteristike', subtitle: 'Upiši šta posjeduje tvoja nekretnina' },
  { path: 'details', title: 'Dodatne informacije i karakteristike', subtitle: 'Upiši šta posjeduje tvoja nekretnina' },
  { path: 'photos', title: 'Dodavanje fotografija', subtitle: 'Dodaj fotografije i izaberi naslovnu' },
  { path: 'publish', title: 'Objava oglasa', subtitle: 'U par klikova postavi cijenu i objavi oglas' },
];