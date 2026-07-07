import { isAdministratorEmail } from './admin';

export const ROLE_LEVELS: Record<string, number> = {
  pdg: 100,
  patron: 90,
  admin: 90,
  directeur: 70,
  dispatcher: 50,
  chauffeur: 30,
  tractionnaire: 20,
  candidat: 10,
  visitor: 5,
  visiteur: 5,
};

export const VALIDATOR_MIN_LEVEL = 70;

export function canValidateRoadSheets(roleOrEmail: string | null | undefined): boolean {
  if (!roleOrEmail) return false;
  if (roleOrEmail.includes('@')) return isAdministratorEmail(roleOrEmail);
  return (ROLE_LEVELS[roleOrEmail] ?? 0) >= VALIDATOR_MIN_LEVEL;
}
