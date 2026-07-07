export const ADMIN_EMAIL = 'domthekillgaming76@gmail.com';

export function isAdministratorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
