import { Injectable } from '@angular/core';

const STORAGE_KEY = 'wallet.userId';

// Identidad provisional del usuario hasta que exista un mecanismo de sesión posterior al onboarding.
@Injectable({ providedIn: 'root' })
export class UserSession {
  readonly userId: string = this.loadOrCreate();

  private loadOrCreate(): string {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }
    const created = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, created);
    return created;
  }
}
