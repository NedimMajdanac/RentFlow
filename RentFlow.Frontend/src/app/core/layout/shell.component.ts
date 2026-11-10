import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthApiService } from '../../api-services/auth-api.service';
import { CurrentUserService } from '../services/current-user.service';

interface NavItem {
  label: string;
  path: string;
  icon: 'home' | 'building' | 'search' | 'send' | 'card' | 'file';
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthApiService);
  readonly me = inject(CurrentUserService);

  readonly menuOpen = signal(false);
  readonly pageTitle = signal('');

  readonly nav: NavItem[] = [
    { label: 'Pregled', path: '/dashboard', icon: 'home' },
    { label: 'Moje nekretnine', path: '/my-properties', icon: 'building' },
    { label: 'Pregledaj nekretnine', path: '/listings', icon: 'search' },
    { label: 'Moji zahtjevi', path: '/requests', icon: 'send' },
    { label: 'Transakcije', path: '/transactions', icon: 'card' },
    { label: 'Ugovori', path: '/contracts', icon: 'file' },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuOpen.set(false);
        this.updateTitle();
      });
  }

  ngOnInit(): void {
    this.me.refresh();
    this.updateTitle();
  }

  @HostListener('document:keydown.escape')
  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onSearch(value: string): void {
    // TODO: kad bude gotova lista oglasa, navigiraj na /listings s ?search=
    console.log('Pretraga:', value);
  }

  logout(): void {
    // TODO(starter): ako logout vraća Observable (poništava refresh token), pozovi subscribe
    this.auth.logout({ refreshToken: localStorage.getItem('refreshToken') ?? '' }).subscribe();
    this.me.clear();
    this.router.navigateByUrl('/login');
  }

  /** Naslov za breadcrumb dolazi iz data: { title } na ruti. */
  private updateTitle(): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    this.pageTitle.set(route.data['title'] ?? '');
  }
}