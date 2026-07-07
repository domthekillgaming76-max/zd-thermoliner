import { useState } from 'react';
import {
  Play, CheckCircle, FilePlus, Camera, AlertTriangle, MessageCircle, Receipt, Loader2,
} from 'lucide-react';
import type { TransportMission } from '../../lib/dispatchTypes';

interface DriverQuickActionsProps {
  mission: TransportMission | null;
  onAction: (action: string, payload?: string) => void;
  busy?: boolean;
}

const ACTIONS = [
  { id: 'start', icon: Play, label: 'Démarrer mission', color: 'driver-portal-action-emerald' },
  { id: 'finish', icon: CheckCircle, label: 'Terminer mission', color: 'driver-portal-action-blue' },
  { id: 'sheet', icon: FilePlus, label: 'Feuille de route', color: 'driver-portal-action-red' },
  { id: 'proof', icon: Camera, label: 'Preuve livraison', color: 'driver-portal-action-amber' },
  { id: 'issue', icon: AlertTriangle, label: 'Problème camion', color: 'driver-portal-action-orange' },
  { id: 'contact', icon: MessageCircle, label: 'Contacter admin', color: 'driver-portal-action-purple' },
  { id: 'payslip', icon: Receipt, label: 'Voir fiche de paie', color: 'driver-portal-action-cyan' },
] as const;

export function DriverQuickActions({ mission, onAction, busy }: DriverQuickActionsProps) {
  const [issueOpen, setIssueOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  function handleClick(id: string) {
    if (id === 'issue') {
      setIssueOpen(true);
      return;
    }
    if (id === 'contact') {
      setContactOpen(true);
      return;
    }
    if (id === 'start' && !mission) return;
    if (id === 'finish' && !mission) return;
    onAction(id, mission?.id);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40 uppercase tracking-wide font-semibold px-1">Actions rapides</p>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map(action => {
          const disabled = Boolean(
            busy ||
            ((action.id === 'start' || action.id === 'finish') && !mission) ||
            (action.id === 'start' && mission && !['planned', 'assigned'].includes(mission.status)) ||
            (action.id === 'finish' && mission && mission.status !== 'in_progress'),
          );

          return (
            <button
              key={action.id}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(action.id)}
              className={`driver-portal-action-btn rounded-2xl p-4 flex flex-col items-start gap-2 text-left transition-all ${action.color} ${
                disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-[0.98]'
              }`}
            >
              {busy ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <action.icon className="w-6 h-6" />
              )}
              <span className="text-sm font-bold leading-tight">{action.label}</span>
            </button>
          );
        })}
      </div>

      {issueOpen && (
        <div className="driver-portal-glass rounded-2xl p-4 space-y-3 driver-portal-fade-in">
          <p className="text-sm font-bold text-white">Signaler un problème camion</p>
          <input
            className="erp-input w-full"
            placeholder="Titre (ex: pneu crevé)"
            value={issueTitle}
            onChange={e => setIssueTitle(e.target.value)}
          />
          <textarea
            className="erp-input w-full min-h-[80px]"
            placeholder="Description..."
            value={issueDesc}
            onChange={e => setIssueDesc(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1 py-3 rounded-xl" onClick={() => setIssueOpen(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-primary flex-1 py-3 rounded-xl"
              disabled={!issueTitle.trim() || busy}
              onClick={() => {
                onAction('issue', JSON.stringify({ title: issueTitle, description: issueDesc }));
                setIssueOpen(false);
                setIssueTitle('');
                setIssueDesc('');
              }}
            >
              Envoyer
            </button>
          </div>
        </div>
      )}

      {contactOpen && (
        <div className="driver-portal-glass rounded-2xl p-4 space-y-3 driver-portal-fade-in">
          <p className="text-sm font-bold text-white">Message à l&apos;administration</p>
          <textarea
            className="erp-input w-full min-h-[100px]"
            placeholder="Votre message..."
            value={contactMsg}
            onChange={e => setContactMsg(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1 py-3 rounded-xl" onClick={() => setContactOpen(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-primary flex-1 py-3 rounded-xl"
              disabled={!contactMsg.trim() || busy}
              onClick={() => {
                onAction('contact', contactMsg);
                setContactOpen(false);
                setContactMsg('');
              }}
            >
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
