import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandMark } from '../../../shared/components/brand-mark';

/**
 * Columna de presentación: mensaje de marca y tarjeta informativa. La tarjeta incluye un único
 * enlace a la activación de la wallet; ella y sus etiquetas no son controles.
 */
@Component({
  imports: [BrandMark, RouterLink],
  selector: 'app-brand-hero',
  styleUrl: './brand-hero.css',
  templateUrl: './brand-hero.html',
})
export class BrandHero {}
