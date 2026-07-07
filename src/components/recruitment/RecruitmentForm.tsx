import { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import {
  EMPTY_RECRUITMENT_FORM,
  type CandidateType,
  type RecruitmentFormInput,
} from '../../lib/recruitmentTypes';

interface RecruitmentFormProps {
  initial?: Partial<RecruitmentFormInput>;
  readOnly?: boolean;
  saving?: boolean;
  onSubmit: (input: RecruitmentFormInput) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="erp-card rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  );
}

export function RecruitmentForm({ initial, readOnly, saving, onSubmit }: RecruitmentFormProps) {
  const [form, setForm] = useState<RecruitmentFormInput>({ ...EMPTY_RECRUITMENT_FORM, ...initial });

  useEffect(() => {
    if (initial) setForm(prev => ({ ...prev, ...initial }));
  }, [initial]);

  function set<K extends keyof RecruitmentFormInput>(key: K, value: RecruitmentFormInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (!readOnly) onSubmit(form);
      }}
      className="space-y-4"
    >
      <Section title="Type de candidature">
        <div className="grid sm:grid-cols-2 gap-3">
          {(['chauffeur_rp', 'visiteur'] as CandidateType[]).map(type => (
            <label
              key={type}
              className={`rounded-xl p-4 border cursor-pointer transition-all ${
                form.candidate_type === type
                  ? 'border-teal-500/40 bg-teal-500/10'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'
              } ${readOnly ? 'pointer-events-none opacity-70' : ''}`}
            >
              <input
                type="radio"
                name="candidate_type"
                className="sr-only"
                checked={form.candidate_type === type}
                onChange={() => set('candidate_type', type)}
                disabled={readOnly}
              />
              <p className="font-semibold text-white text-sm">
                {type === 'chauffeur_rp' ? 'Chauffeur RP' : 'Visiteur'}
              </p>
              <p className="text-xs text-white/40 mt-1">
                {type === 'chauffeur_rp'
                  ? 'Rejoindre la flotte et conduire pour Z&D'
                  : 'Accès communautaire limité'}
              </p>
            </label>
          ))}
        </div>
      </Section>

      <Section title="1. Informations personnelles">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Pseudo / Nom en jeu" required>
            <input className="erp-input w-full" value={form.pseudo} onChange={e => set('pseudo', e.target.value)} required disabled={readOnly} />
          </Field>
          <Field label="Âge" required>
            <input type="number" min={16} className="erp-input w-full" value={form.age || ''} onChange={e => set('age', Number(e.target.value))} required disabled={readOnly} />
          </Field>
          <Field label="Pays" required>
            <input className="erp-input w-full" value={form.country} onChange={e => set('country', e.target.value)} required disabled={readOnly} />
          </Field>
          <Field label="Fuseau horaire" required>
            <input className="erp-input w-full" placeholder="UTC+1" value={form.timezone} onChange={e => set('timezone', e.target.value)} required disabled={readOnly} />
          </Field>
        </div>
      </Section>

      <Section title="2. Expérience de jeu">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Depuis combien de temps jouez-vous à ETS2 / ATS ?" required className="sm:col-span-2">
            <input className="erp-input w-full" value={form.experience} onChange={e => set('experience', e.target.value)} required disabled={readOnly} />
          </Field>
          <Field label="Kilométrage total">
            <input className="erp-input w-full" value={form.total_km} onChange={e => set('total_km', e.target.value)} disabled={readOnly} />
          </Field>
          <Field label="Avez-vous déjà été dans une VTC ?">
            <select className="erp-select w-full" value={form.previous_vtc ? 'yes' : 'no'} onChange={e => set('previous_vtc', e.target.value === 'yes')} disabled={readOnly}>
              <option value="no">Non</option>
              <option value="yes">Oui</option>
            </select>
          </Field>
          {form.previous_vtc && (
            <Field label="Si oui, pourquoi avez-vous quitté ?" className="sm:col-span-2">
              <textarea className="erp-input w-full min-h-[80px]" value={form.previous_vtc_reason} onChange={e => set('previous_vtc_reason', e.target.value)} disabled={readOnly} />
            </Field>
          )}
          <Field label="Connaissez-vous TruckersMP ?">
            <select className="erp-select w-full" value={form.truckersmp ? 'yes' : 'no'} onChange={e => set('truckersmp', e.target.value === 'yes')} disabled={readOnly}>
              <option value="no">Non</option>
              <option value="yes">Oui</option>
            </select>
          </Field>
          <Field label="Avez-vous des bans en cours ?">
            <input className="erp-input w-full" placeholder="Non / détails" value={form.active_bans} onChange={e => set('active_bans', e.target.value)} disabled={readOnly} />
          </Field>
        </div>
      </Section>

      <Section title="3. Disponibilités">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Jours disponibles" required>
            <input className="erp-input w-full" placeholder="Lun, Mar, Ven..." value={form.available_days} onChange={e => set('available_days', e.target.value)} required disabled={readOnly} />
          </Field>
          <Field label="Heures disponibles" required>
            <input className="erp-input w-full" placeholder="18h–23h" value={form.available_hours} onChange={e => set('available_hours', e.target.value)} required disabled={readOnly} />
          </Field>
          <Field label="Fréquence de jeu" required className="sm:col-span-2">
            <input className="erp-input w-full" placeholder="3–4 fois par semaine" value={form.play_frequency} onChange={e => set('play_frequency', e.target.value)} required disabled={readOnly} />
          </Field>
        </div>
      </Section>

      <Section title="4. Motivation">
        <div className="space-y-4">
          <Field label="Pourquoi souhaitez-vous rejoindre Z&D Thermoliner ?" required>
            <textarea className="erp-input w-full min-h-[100px]" value={form.motivation} onChange={e => set('motivation', e.target.value)} required disabled={readOnly} />
          </Field>
          <Field label="Que pouvez-vous apporter à l'entreprise ?" required>
            <textarea className="erp-input w-full min-h-[80px]" value={form.contribution} onChange={e => set('contribution', e.target.value)} required disabled={readOnly} />
          </Field>
          <label className="flex items-start gap-2 text-sm text-white/60">
            <input type="checkbox" checked={form.accepts_rules} onChange={e => set('accepts_rules', e.target.checked)} disabled={readOnly} className="mt-1" />
            Êtes-vous prêt à respecter le règlement Z&D Thermoliner ?
          </label>
        </div>
      </Section>

      <Section title="5. Style RP">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Conduite solo ou convoi ?">
            <input className="erp-input w-full" value={form.driving_style} onChange={e => set('driving_style', e.target.value)} disabled={readOnly} />
          </Field>
          <div className="space-y-3 sm:col-span-2">
            {[
              { key: 'discord_ok' as const, label: 'Êtes-vous à l\'aise avec Discord ?' },
              { key: 'long_distance_ok' as const, label: 'Acceptez-vous les livraisons longues distances ?' },
              { key: 'realism_rules_ok' as const, label: 'Acceptez-vous les règles de réalisme ?' },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-2 text-sm text-white/60">
                <input type="checkbox" checked={form[item.key]} onChange={e => set(item.key, e.target.checked)} disabled={readOnly} />
                {item.label}
              </label>
            ))}
          </div>
        </div>
      </Section>

      {!readOnly && (
        <button type="submit" disabled={saving || !form.accepts_rules} className="btn-primary w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Envoyer ma candidature
        </button>
      )}
    </form>
  );
}
