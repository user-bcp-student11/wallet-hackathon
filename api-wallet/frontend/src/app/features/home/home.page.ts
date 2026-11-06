import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MESSAGES } from '../../core/i18n/messages.es-pe';
import { Icon } from '../../shared/ui/icon';

/** Landing "Al toque": presenta la wallet y lleva al registro. No existe inicio de sesión. */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, Icon],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
})
export class HomePage {
  protected readonly t = MESSAGES.home;
}
