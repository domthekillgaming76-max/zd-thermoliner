import { isAdministratorEmail } from './admin';
import { canUseCapability, isFlotteRole } from './accessService';

export function canAskGlobalQuestions(role: string | null | undefined, email?: string | null): boolean {
  return canUseCapability(role, email, 'manage_ops');
}

export function canViewFinancialSummaries(role: string | null | undefined, email?: string | null): boolean {
  return canUseCapability(role, email, 'manage_finance');
}

export function canTriggerAutomations(role: string | null | undefined, email?: string | null): boolean {
  return canUseCapability(role, email, 'manage_ops');
}

export function isDriverAssistantMode(role: string | null | undefined, email?: string | null): boolean {
  if (isAdministratorEmail(email)) return false;
  return isFlotteRole(role);
}

export function getAssistantGreeting(role: string | null | undefined, email?: string | null): string {
  if (isAdministratorEmail(email)) {
    return 'Bonjour DOM76 — je suis votre assistant Z&D. Posez-moi une question sur l\'entreprise.';
  }
  if (canAskGlobalQuestions(role, email)) {
    return 'Bonjour — je peux analyser les données ERP et suggérer des actions.';
  }
  if (isDriverAssistantMode(role, email)) {
    return 'Bonjour chauffeur — je peux vous aider avec vos feuilles de route, missions et profil.';
  }
  return 'Bonjour — comment puis-je vous aider ?';
}
