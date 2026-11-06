import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Title } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App (shell y rutas)', () => {
  let fixture: ComponentFixture<App>;
  let router: Router;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClientTesting()],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(App);
    root = fixture.nativeElement;
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function navigate(url: string): Promise<void> {
    await router.navigateByUrl(url);
    await fixture.whenStable();
  }

  describe('definición de rutas', () => {
    it('solo hay dos rutas: la landing y la activación (más el comodín)', () => {
      expect(routes.map((route) => route.path)).toEqual(['', 'activacion', '**']);
    });

    it('las rutas no están protegidas', () => {
      for (const route of routes) {
        expect(route.canActivate).toBeUndefined();
        expect(route.canMatch).toBeUndefined();
        expect(route.canActivateChild).toBeUndefined();
      }
    });
  });

  describe('estructura', () => {
    it('muestra el encabezado y el pie del concepto', async () => {
      await navigate('/');

      expect(root.querySelector('.brand')?.textContent).toContain('Al toque');
      expect(root.querySelector('.tag')?.textContent).toBe('Tu wallet, a tu manera');
      expect(root.querySelector('.footer')?.textContent).toContain('© Al toque');
      expect(root.querySelector('.footer')?.textContent).toContain('Simple. Cerca. Contigo.');
    });

    it('la marca del encabezado enlaza a la landing', async () => {
      await navigate('/');

      expect(root.querySelector('a.brand')?.getAttribute('href')).toBe('/');
    });
  });

  describe('nombre comercial', () => {
    it('la marca visible es «Al toque» en encabezado, tarjeta, bienvenida y pie', async () => {
      await navigate('/');

      expect(root.querySelector('.brand')?.textContent).toContain('Al toque');
      expect(root.querySelector('.card-brand')?.textContent).toContain('Al toque');
      expect(root.querySelector('.kicker')?.textContent).toContain('BIENVENIDO A AL TOQUE');
      expect(root.querySelector('.footer')?.textContent).toContain('© Al toque');
      expect(root.textContent).not.toMatch(/bcp/i);
    });

    it('los títulos de página usan «Al toque»', async () => {
      const title = TestBed.inject(Title);

      await navigate('/');
      expect(title.getTitle()).toBe('Al toque');

      await navigate('/activacion');
      expect(title.getTitle()).toBe('Activa tu wallet · Al toque');
    });
  });

  describe('navegación', () => {
    it('la ruta principal muestra la landing', async () => {
      await navigate('/');

      expect(router.url).toBe('/');
      expect(root.querySelector('app-home')).not.toBeNull();
      expect(root.querySelector('h1')?.textContent).toContain('más simple.');
    });

    it('«Regístrate» lleva a la pantalla de activación', async () => {
      await navigate('/');

      root.querySelector<HTMLAnchorElement>('a.button')!.click();
      await fixture.whenStable();

      expect(router.url).toBe('/activacion');
      expect(root.querySelector('app-activation')).not.toBeNull();
      expect(root.querySelector('h1')?.textContent).toContain('Activa tu wallet');
      expect(root.querySelector('#document-type')).not.toBeNull();
      expect(root.querySelector('#document-number')).not.toBeNull();
      expect(root.querySelector('button[type="submit"]')?.textContent).toContain('Continuar');
    });

    it('«Ya tengo cuenta: activar mi wallet» lleva a la activación', async () => {
      await navigate('/');

      root.querySelector<HTMLAnchorElement>('.panel a.button-secondary')!.click();
      await fixture.whenStable();

      expect(router.url).toBe('/activacion');
      expect(root.querySelector('h1')?.textContent).toContain('Activa tu wallet');
    });

    it('el enlace de la tarjeta «Paga y transfiere» lleva a la activación', async () => {
      await navigate('/');

      root.querySelector<HTMLAnchorElement>('.card-preview a.card-link')!.click();
      await fixture.whenStable();

      expect(router.url).toBe('/activacion');
      expect(root.querySelector('app-activation')).not.toBeNull();
    });

    it('«Regístrate» está disponible sin consultar ninguna API', async () => {
      // El afterEach verifica que no hubo solicitudes HTTP pendientes.
      await navigate('/');

      expect(root.querySelector<HTMLAnchorElement>('a.button')?.textContent).toContain(
        'Regístrate',
      );
    });

    it('la activación se puede abrir directamente, sin protección', async () => {
      await navigate('/activacion');

      expect(router.url).toBe('/activacion');
      expect(root.querySelector('h1')?.textContent).toContain('Activa tu wallet');
    });

    it('desde la activación se puede volver a la landing', async () => {
      await navigate('/activacion');

      root.querySelector<HTMLAnchorElement>('a.back')!.click();
      await fixture.whenStable();

      expect(router.url).toBe('/');
      expect(root.querySelector('app-home')).not.toBeNull();
    });

    it('una ruta desconocida redirige a la landing', async () => {
      await navigate('/no-existe');

      expect(router.url).toBe('/');
      expect(root.querySelector('app-home')).not.toBeNull();
    });

    it('al navegar mueve el foco al contenido principal', async () => {
      await navigate('/');

      root.querySelector<HTMLAnchorElement>('a.button')!.click();
      await fixture.whenStable();

      expect(document.activeElement).toBe(root.querySelector('main'));
    });
  });
});
