import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MESSAGES } from '../../core/i18n/messages.es-pe';
import { HomePage } from './home.page';

describe('HomePage', () => {
  it('ofrece los accesos al registro (no hay inicio de sesión)', async () => {
    TestBed.configureTestingModule({ imports: [HomePage], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const links = [...el.querySelectorAll('a')];
    for (const label of [MESSAGES.home.register, MESSAGES.home.activate, MESSAGES.home.promoCta]) {
      const link = links.find((a) => a.textContent?.includes(label));
      expect(link?.getAttribute('href')).toBe('/registro');
    }
    expect(el.querySelector('h1')?.textContent).toContain(MESSAGES.home.titleHighlight);
  });
});
