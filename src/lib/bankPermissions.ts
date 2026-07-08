import { isAdministratorEmail } from './admin';
import { canAccessModule } from './roleEngine';

/** Banque réservée au rôle admin (et DOM76). */
export function canAccessBank(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  return canAccessModule(role, 'bank');
}
