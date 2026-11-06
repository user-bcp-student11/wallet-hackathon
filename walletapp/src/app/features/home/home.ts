import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandMark } from '../../shared/components/brand-mark';
import { BrandHero } from './components/brand-hero';

/**
 * Pantalla principal. Solo ofrece el acceso a «Regístrate»: no hay inicio de sesión porque el
 * contrato del mock no define autenticación (ver reglas-de-negocio/inicio-y-activacion.md).
 */
@Component({
  imports: [RouterLink, BrandHero, BrandMark],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home {}
