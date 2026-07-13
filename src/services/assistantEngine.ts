import type {
  AssistantDataSnapshot,
  AssistantKpi,
  AssistantReply,
  SuggestedAction,
} from '../lib/assistantTypes';
import { AUTOMATION_LABELS } from '../lib/assistantTypes';
import {
  canAskGlobalQuestions,
  canTriggerAutomations,
  canViewFinancialSummaries,
  isDriverAssistantMode,
} from '../lib/assistantPermissions';
import { formatCurrency } from './assistantDataService';

function match(text: string, patterns: string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some(p => lower.includes(p));
}

function buildGlobalSuggestions(snapshot: AssistantDataSnapshot): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  let id = 0;

  if (snapshot.pendingRoadSheets > 0) {
    actions.push({
      id: `a-${++id}`,
      type: 'validate_road_sheets',
      title: AUTOMATION_LABELS.validate_road_sheets,
      description: `${snapshot.pendingRoadSheets} feuille(s) à valider`,
      requiresConfirmation: true,
      route: '/road-sheets',
    });
  }
  if (snapshot.lateInvoices > 0) {
    actions.push({
      id: `a-${++id}`,
      type: 'contact_late_clients',
      title: AUTOMATION_LABELS.contact_late_clients,
      description: `${snapshot.lateInvoices} facture(s) en retard`,
      requiresConfirmation: true,
      route: '/clients',
    });
  }
  if (snapshot.urgentMaintenance > 0) {
    actions.push({
      id: `a-${++id}`,
      type: 'schedule_maintenance',
      title: AUTOMATION_LABELS.schedule_maintenance,
      description: `${snapshot.urgentMaintenance} alerte(s) maintenance urgente`,
      requiresConfirmation: true,
      route: '/maintenance',
    });
  }
  if (snapshot.pendingMissions > 0) {
    actions.push({
      id: `a-${++id}`,
      type: 'create_mission',
      title: 'Voir les feuilles de route',
      description: `${snapshot.pendingMissions} mission(s) active(s)`,
      requiresConfirmation: false,
      route: '/road-sheets',
    });
  }
  if (snapshot.monthlyExpenses > snapshot.monthlyEarnings * 0.7) {
    actions.push({
      id: `a-${++id}`,
      type: 'reduce_expenses',
      title: AUTOMATION_LABELS.reduce_expenses,
      description: 'Les dépenses représentent une part élevée des revenus',
      requiresConfirmation: true,
      route: '/finance',
    });
  }
  actions.push({
    id: `a-${++id}`,
    type: 'optimize_route',
    title: AUTOMATION_LABELS.optimize_route,
    description: 'Analyser les itinéraires pour réduire les km',
    requiresConfirmation: true,
    route: '/road-sheets',
  });

  return actions.slice(0, 5);
}

export function generateAssistantReply(
  question: string,
  snapshot: AssistantDataSnapshot,
  role: string | null | undefined,
  email?: string | null,
): AssistantReply {
  const global = canAskGlobalQuestions(role, email);
  const financial = canViewFinancialSummaries(role, email);
  const driver = isDriverAssistantMode(role, email);

  if (financial && match(question, ['gagné', 'gagne', 'revenu', 'revenus', 'ce mois', 'earnings'])) {
    const kpis: AssistantKpi[] = [
      { label: 'Revenus ce mois', value: formatCurrency(snapshot.monthlyEarnings), color: '#34d399' },
      { label: 'Dépenses ce mois', value: formatCurrency(snapshot.monthlyExpenses), color: '#f87171' },
      {
        label: 'Résultat net',
        value: formatCurrency(snapshot.monthlyEarnings - snapshot.monthlyExpenses),
        color: snapshot.monthlyEarnings >= snapshot.monthlyExpenses ? '#34d399' : '#fbbf24',
      },
    ];
    return {
      content: `Ce mois-ci, Z&D Thermoliner a enregistré ${formatCurrency(snapshot.monthlyEarnings)} de revenus et ${formatCurrency(snapshot.monthlyExpenses)} de dépenses.`,
      metadata: { kpis, actions: buildGlobalSuggestions(snapshot) },
    };
  }

  if (global && match(question, ['chauffeur', 'rentable', 'profitable', 'driver'])) {
    const kpis: AssistantKpi[] = snapshot.topDriver
      ? [{ label: 'Chauffeur le plus rentable', value: snapshot.topDriver.name, trend: formatCurrency(snapshot.topDriver.profit) }]
      : [{ label: 'Données', value: 'Insuffisantes', color: '#fbbf24' }];
    return {
      content: snapshot.topDriver
        ? `Le chauffeur le plus rentable est **${snapshot.topDriver.name}** avec un profit estimé de ${formatCurrency(snapshot.topDriver.profit)}.`
        : 'Pas assez de données chauffeurs pour déterminer le plus rentable.',
      metadata: { kpis, actions: buildGlobalSuggestions(snapshot) },
    };
  }

  if (global && match(question, ['camion', 'truck', 'coûte', 'coute', 'cher', 'coût'])) {
    const kpis: AssistantKpi[] = snapshot.costliestTruck
      ? [{ label: 'Camion le plus coûteux', value: snapshot.costliestTruck.label, trend: formatCurrency(snapshot.costliestTruck.cost) }]
      : [{ label: 'Données', value: 'Non disponibles' }];
    return {
      content: snapshot.costliestTruck
        ? `Le camion le plus coûteux est **${snapshot.costliestTruck.label}** (${formatCurrency(snapshot.costliestTruck.cost)} de coûts cumulés).`
        : 'Aucune donnée de coûts flotte disponible.',
      metadata: { kpis, actions: buildGlobalSuggestions(snapshot) },
    };
  }

  if (match(question, ['feuille', 'road sheet', 'en attente', 'pending', 'attente'])) {
    if (driver) {
      return {
        content: `Vous avez **${snapshot.driverRoadSheets ?? 0}** feuille(s) de route en cours ou en attente de validation.`,
        metadata: {
          kpis: [{ label: 'Mes feuilles actives', value: String(snapshot.driverRoadSheets ?? 0) }],
          actions: [{ id: 'd1', type: 'validate_road_sheets', title: 'Voir mes feuilles', description: 'Accéder aux feuilles de route', requiresConfirmation: false, route: '/road-sheets' }],
        },
      };
    }
    if (global) {
      return {
        content: `**${snapshot.pendingRoadSheets}** feuille(s) de route sont en attente de validation.`,
        metadata: {
          kpis: [{ label: 'Feuilles en attente', value: String(snapshot.pendingRoadSheets), color: '#fbbf24' }],
          actions: buildGlobalSuggestions(snapshot),
        },
      };
    }
  }

  if (global && match(question, ['facture', 'retard', 'impayé', 'late', 'invoice'])) {
    return {
      content: `**${snapshot.lateInvoices}** facture(s) sont en retard de paiement.`,
      metadata: {
        kpis: [{ label: 'Factures en retard', value: String(snapshot.lateInvoices), color: '#f87171' }],
        actions: buildGlobalSuggestions(snapshot),
      },
    };
  }

  if (match(question, ['solde', 'balance', 'banque', 'trésorerie'])) {
    if (!financial) {
      return { content: 'Les données financières globales sont réservées aux administrateurs.', metadata: { restricted: true } };
    }
    return {
      content: `Le solde actuel du compte entreprise est de **${formatCurrency(snapshot.companyBalance)}**.`,
      metadata: {
        kpis: [
          { label: 'Solde entreprise', value: formatCurrency(snapshot.companyBalance), color: '#60a5fa' },
          { label: 'Revenus mois', value: formatCurrency(snapshot.monthlyEarnings) },
        ],
        actions: buildGlobalSuggestions(snapshot),
      },
    };
  }

  if (global && match(question, ['maintenance', 'urgent', 'réparation'])) {
    return {
      content: snapshot.urgentMaintenance > 0
        ? `**${snapshot.urgentMaintenance}** alerte(s) de maintenance urgente nécessitent votre attention.`
        : 'Aucune maintenance urgente détectée. La flotte est en bon état.',
      metadata: {
        kpis: [{ label: 'Alertes urgentes', value: String(snapshot.urgentMaintenance), color: snapshot.urgentMaintenance > 0 ? '#f87171' : '#34d399' }],
        actions: buildGlobalSuggestions(snapshot),
      },
    };
  }

  if (global && match(question, ['améliorer', 'ameliorer', 'suggestion', 'conseil', 'optimiser', 'improve'])) {
    const suggestions: string[] = [];
    if (snapshot.pendingRoadSheets > 0) suggestions.push(`Valider ${snapshot.pendingRoadSheets} feuille(s) de route en attente`);
    if (snapshot.lateInvoices > 0) suggestions.push(`Relancer ${snapshot.lateInvoices} client(s) avec factures en retard`);
    if (snapshot.urgentMaintenance > 0) suggestions.push(`Planifier ${snapshot.urgentMaintenance} maintenance(s) urgente(s)`);
    if (snapshot.monthlyExpenses > snapshot.monthlyEarnings) suggestions.push('Réduire les dépenses — le mois est déficitaire');
    if (suggestions.length === 0) suggestions.push('Continuer à monitorer la flotte et les performances chauffeurs');

    return {
      content: `Voici mes recommandations :\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
      metadata: { actions: buildGlobalSuggestions(snapshot) },
    };
  }

  if (driver && match(question, ['mission', 'missions', 'dispatch'])) {
    return {
      content: `Vous avez **${snapshot.driverMissions ?? 0}** mission(s) active(s).`,
      metadata: {
        kpis: [{ label: 'Missions actives', value: String(snapshot.driverMissions ?? 0) }],
        actions: [{ id: 'd2', type: 'create_mission', title: 'Voir mes feuilles', description: 'Consulter vos feuilles de route', requiresConfirmation: false, route: '/road-sheets' }],
      },
    };
  }

  if (driver && match(question, ['salaire', 'salary', 'paie'])) {
    return {
      content: `Votre salaire mensuel estimé est de **${formatCurrency(snapshot.driverSalary ?? 0)}**.`,
      metadata: { kpis: [{ label: 'Salaire mensuel', value: formatCurrency(snapshot.driverSalary ?? 0) }] },
    };
  }

  if (driver && match(question, ['profil', 'profile', 'mon compte'])) {
    return {
      content: 'Consultez votre profil pour mettre à jour vos informations chauffeur.',
      metadata: {
        actions: [{ id: 'd3', type: 'pay_driver_salary', title: 'Mon profil', description: 'Accéder au profil', requiresConfirmation: false, route: '/profile' }],
      },
    };
  }

  return {
    content: global
      ? 'Je peux répondre sur les revenus, chauffeurs, camions, feuilles de route, factures, solde, maintenance et suggestions d\'amélioration. Utilisez les boutons rapides ci-dessus.'
      : driver
        ? 'Je peux vous aider avec vos feuilles de route, missions, salaire et profil.'
        : 'Posez une question ou utilisez un bouton de suggestion rapide.',
    metadata: global ? { actions: buildGlobalSuggestions(snapshot) } : {},
  };
}

export function filterActionsForRole(
  actions: SuggestedAction[],
  role: string | null | undefined,
  email?: string | null,
): SuggestedAction[] {
  if (canTriggerAutomations(role, email)) return actions;
  return actions.filter(a => !a.requiresConfirmation);
}
