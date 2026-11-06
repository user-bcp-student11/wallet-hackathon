import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, skip } from 'rxjs';
import { BrandMark } from './shared/components/brand-mark';

@Component({
  imports: [RouterOutlet, RouterLink, BrandMark],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly main = viewChild<ElementRef<HTMLElement>>('main');

  constructor() {
    // Accesibilidad: tras cada navegación el foco pasa al contenido principal, para que los
    // lectores de pantalla y el teclado no se queden en el enlace que se acaba de usar.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.main()?.nativeElement.focus({ preventScroll: true }));
  }
}
