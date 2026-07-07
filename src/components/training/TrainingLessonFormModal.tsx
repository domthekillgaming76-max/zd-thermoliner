import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { LessonInput, TrainingLessonCategory } from '../../lib/trainingTypes';

interface TrainingLessonFormModalProps {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: LessonInput) => void;
}

const CATEGORIES: TrainingLessonCategory[] = [
  'new_recruit', 'driver', 'convoy', 'economy', 'road_sheets', 'fleet', 'safety', 'admin',
];

export function TrainingLessonFormModal({ open, saving, onClose, onSubmit }: TrainingLessonFormModalProps) {
  const [form, setForm] = useState<LessonInput>({
    title: '', description: '', category: 'driver', content: '', duration_minutes: 15, required_role: 'all',
  });

  useEffect(() => {
    if (open) setForm({ title: '', description: '', category: 'driver', content: '', duration_minutes: 15, required_role: 'all' });
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="training-glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/95 backdrop-blur">
          <h2 className="font-bold text-white">Nouvelle leçon</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 hover:bg-white/5 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="p-5 space-y-3">
          <Field label="Titre *">
            <input required className="erp-input w-full" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </Field>
          <Field label="Description">
            <input className="erp-input w-full" value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie">
              <select className="erp-select w-full" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as TrainingLessonCategory }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Durée (min)">
              <input type="number" className="erp-input w-full" value={form.duration_minutes ?? 15} onChange={e => setForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))} />
            </Field>
          </div>
          <Field label="Rôle requis">
            <select className="erp-select w-full" value={form.required_role ?? 'all'} onChange={e => setForm(p => ({ ...p, required_role: e.target.value }))}>
              <option value="all">Tous</option>
              <option value="chauffeur">Chauffeur</option>
              <option value="dispatcher">Dispatcher</option>
            </select>
          </Field>
          <Field label="URL vidéo">
            <input className="erp-input w-full" value={form.video_url ?? ''} onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))} />
          </Field>
          <Field label="Contenu *">
            <textarea required className="erp-input w-full min-h-[120px]" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 erp-btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 erp-btn-primary">{saving ? 'Création…' : 'Publier'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/40 uppercase mb-1">{label}</label>
      {children}
    </div>
  );
}
