import { isAdministratorEmail } from './admin';

/** Banque réservée au rôle admin (et propriétaire technique). */
export function canAccessBank(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return true;
  return role === 'admin';
}
