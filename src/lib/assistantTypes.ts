export type AiMessageRole = 'user' | 'assistant' | 'system';

export type AutomationTaskStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type AssistantActionStatus =
  | 'logged'
  | 'pending_confirmation'
  | 'executed'
  | 'cancelled'
  | 'failed';

export type AutomationTaskType =
  | 'validate_road_sheets'
  | 'pay_driver_salary'
  | 'schedule_maintenance'
  | 'contact_late_clients'
  | 'create_mission'
  | 'create_invoice'
  | 'optimize_route'
  | 'reduce_expenses';

export interface AiConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AssistantKpi {
  label: string;
  value: string;
  trend?: string;
  color?: string;
}

export interface SuggestedAction {
  id: string;
  type: AutomationTaskType;
  title: string;
  description: string;
  requiresConfirmation: boolean;
  route?: string;
}

export interface AiMessageMetadata {
  kpis?: AssistantKpi[];
  actions?: SuggestedAction[];
  restricted?: boolean;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: AiMessageRole;
  content: string;
  metadata: AiMessageMetadata;
  created_at: string;
}

export interface AutomationTask {
  id: string;
  user_id: string;
  task_type: string;
  title: string;
  description: string | null;
  payload: Record<string, unknown>;
  status: AutomationTaskStatus;
  requires_confirmation: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface AssistantAction {
  id: string;
  user_id: string;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  payload: Record<string, unknown>;
  status: AssistantActionStatus;
  error_message: string | null;
  created_at: string;
}

export interface AssistantDataSnapshot {
  monthlyEarnings: number;
  monthlyExpenses: number;
  companyBalance: number;
  topDriver: { name: string; profit: number } | null;
  costliestTruck: { label: string; cost: number } | null;
  pendingRoadSheets: number;
  lateInvoices: number;
  urgentMaintenance: number;
  pendingMissions: number;
  driverRoadSheets?: number;
  driverMissions?: number;
  driverSalary?: number;
}

export interface AssistantReply {
  content: string;
  metadata: AiMessageMetadata;
}

export const QUICK_PROMPTS_ADMIN = [
  'Combien avons-nous gagné ce mois ?',
  'Quel chauffeur est le plus rentable ?',
  'Quel camion coûte le plus ?',
  'Quelles feuilles de route sont en attente ?',
  'Quelles factures sont en retard ?',
  'Quel est le solde de l\'entreprise ?',
  'Quelle maintenance est urgente ?',
  'Que devrions-nous améliorer ?',
] as const;

export const QUICK_PROMPTS_DRIVER = [
  'Mes feuilles de route en cours',
  'Mes missions du jour',
  'Mon profil chauffeur',
  'Mon salaire estimé',
] as const;

export const AUTOMATION_LABELS: Record<AutomationTaskType, string> = {
  validate_road_sheets: 'Valider les feuilles en attente',
  pay_driver_salary: 'Payer les salaires chauffeurs',
  schedule_maintenance: 'Planifier la maintenance',
  contact_late_clients: 'Contacter les clients en retard',
  create_mission: 'Créer une mission',
  create_invoice: 'Créer une facture',
  optimize_route: 'Optimiser les itinéraires',
  reduce_expenses: 'Réduire les dépenses',
};
