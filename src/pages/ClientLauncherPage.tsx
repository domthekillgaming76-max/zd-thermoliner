import { useCallback, useEffect, useState } from 'react';
import {
  Download,
  Monitor,
  CheckCircle2,
  ExternalLink,
  Truck,
  Shield,
  Copy,
  RefreshCw,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/erp/PageHeader';
import { FormAlert } from '../components/erp/FormAlert';
import { useAuth } from '../contexts/AuthContext';
import { canAccessAdministration } from '../lib/adminPermissions';
import {
  fetchLatestClientRelease,
  publishClientRelease,
} from '../services/clientReleaseService';
import type { ClientAppRelease } from '../lib/clientReleaseTypes';

const INSTALL_STEPS = [
  {
    title: 'Télécharger l\'installateur',
    description: 'Cliquez sur le bouton « Télécharger le client Windows » ci-dessous. Enregistrez le fichier .exe sur votre PC.',
  },
  {
    title: 'Lancer l\'installation',
    description: 'Double-cliquez sur le fichier téléchargé. Si Windows affiche un avertissement, choisissez « Exécuter quand même » ou « Plus d\'infos » puis « Exécuter ».',
  },
  {
    title: 'Suivre l\'assistant',
    description: 'Cliquez sur Suivant → Installer → Terminer. L\'installation prend moins d\'une minute.',
  },
  {
    title: 'Se connecter à l\'ERP',
    description: 'Ouvrez « Z&D Thermoliner Launcher », entrez l\'URL ERP ci-dessous, puis votre email et mot de passe Z&D.',
  },
  {
    title: 'Jouer et synchroniser',
    description: 'Lancez ETS2 ou ATS depuis le launcher. La télémétrie et les missions se synchronisent automatiquement avec l\'ERP.',
  },
];

function erpUrlHint(): string {
  if (typeof window === 'undefined') return 'https://erp.zd-thermoliner.fr';
  return window.location.origin;
}

export function ClientLauncherPage() {
  const { profile, user } = useAuth();
  const canManage = canAccessAdministration(profile?.role, user?.email ?? profile?.email);

  const [release, setRelease] = useState<ClientAppRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminForm, setAdminForm] = useState({
    version: '1.0.14',
    download_url: '',
    changelog: '',
    mandatory: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const latest = await fetchLatestClientRelease();
      setRelease(latest);
      if (latest) {
        setAdminForm({
          version: latest.version,
          download_url: latest.download_url ?? '',
          changelog: latest.changelog,
          mandatory: latest.mandatory,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger la release client');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const downloadUrl = release?.download_url?.trim() || '';
  const hasDownload = downloadUrl.length > 0;

  function handleDownload() {
    if (!hasDownload) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.rel = 'noopener noreferrer';
    a.download = release?.version
      ? `ZD-Thermoliner-Launcher-Windows-${release.version}-Setup.exe`
      : 'ZD-Thermoliner-Launcher-Setup.exe';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function copyErpUrl() {
    void navigator.clipboard.writeText(erpUrlHint());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handlePublish() {
    setSaving(true);
    setError(null);
    try {
      await publishClientRelease(adminForm);
      setSuccess('Release client publiée — visible pour tous les chauffeurs.');
      setTimeout(() => setSuccess(null), 4000);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publication impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <PageHeader
          icon={Download}
          title="Client Windows"
          subtitle="Téléchargez le launcher Z&D Thermoliner pour ETS2 / ATS — installation simple en quelques clics"
        />

        {error && <FormAlert message={error} onDismiss={() => setError(null)} />}
        {success && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-emerald-400 text-sm border border-emerald-500/20 bg-emerald-500/10">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Hero download card */}
        <section className="admin-glass rounded-2xl p-6 border border-primary-500/20">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 bg-primary-500/15 border border-primary-500/30">
              <Monitor className="w-8 h-8 text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-primary-400/80 mb-1">
                Z&D Thermoliner Launcher
              </p>
              <h2 className="text-xl font-black text-white">
                {loading ? 'Chargement…' : release ? `Version ${release.version}` : 'Client Windows'}
              </h2>
              <p className="text-sm text-white/45 mt-2 leading-relaxed">
                Compagnon chauffeur officiel : connexion ERP, télémétrie ETS2/ATS, missions et synchronisation automatique.
              </p>
              {release?.changelog && (
                <p className="text-xs text-white/35 mt-3 whitespace-pre-line">{release.changelog}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!hasDownload || loading}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-primary"
                >
                  <Download className="w-5 h-5" />
                  Télécharger le client Windows
                  {hasDownload && <ExternalLink className="w-4 h-4 opacity-70" />}
                </button>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-white/50 border border-white/10 hover:bg-white/5"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Actualiser
                </button>
              </div>
              {!hasDownload && !loading && (
                <p className="text-xs text-amber-400/90 mt-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Lien de téléchargement non configuré — contactez un administrateur.
                </p>
              )}
              {hasDownload && (
                <p className="text-xs text-white/30 mt-3 leading-relaxed">
                  Si Microsoft Edge affiche «&nbsp;pas fréquemment téléchargé&nbsp;», cliquez sur les trois points
                  {' '}<span className="text-white/45">⋯</span> puis <strong className="text-white/50">Conserver</strong>.
                  {' '}Installateur officiel Z&amp;D Thermoliner — signature en cours de déploiement.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ERP URL */}
        <section className="admin-glass rounded-2xl p-5 border border-white/5">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary-400" />
            URL ERP à saisir dans le launcher
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm text-emerald-400 font-mono truncate">
              {erpUrlHint()}
            </code>
            <button
              type="button"
              onClick={copyErpUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-white/10 text-white/60 hover:text-white hover:bg-white/5"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>
        </section>

        {/* Install steps */}
        <section className="admin-glass rounded-2xl p-5 border border-white/5">
          <h3 className="text-sm font-bold text-white mb-4">Installation en 5 étapes</h3>
          <ol className="space-y-4">
            {INSTALL_STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-black bg-primary-500/15 text-primary-400 border border-primary-500/25">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Requirements */}
        <section className="rounded-2xl p-5 border border-white/5 bg-white/[0.02]">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-white/40" />
            Prérequis
          </h3>
          <ul className="text-xs text-white/40 space-y-1.5 list-disc list-inside">
            <li>Windows 10 ou 11 (64 bits)</li>
            <li>Euro Truck Simulator 2 ou American Truck Simulator</li>
            <li>Compte Z&D Thermoliner (email + mot de passe ERP)</li>
            <li>Connexion Internet pour la synchronisation</li>
          </ul>
        </section>

        {/* Admin publish */}
        {canManage && (
          <section className="admin-glass rounded-2xl p-5 border border-amber-500/20">
            <h3 className="text-sm font-bold text-amber-400 mb-4">Administration — lien de téléchargement</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 block mb-1">Version</label>
                  <input
                    value={adminForm.version}
                    onChange={e => setAdminForm(f => ({ ...f, version: e.target.value }))}
                    className="erp-input w-full text-sm"
                    placeholder="1.0.14"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-white/60 self-end pb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminForm.mandatory}
                    onChange={e => setAdminForm(f => ({ ...f, mandatory: e.target.checked }))}
                    className="rounded border-white/20"
                  />
                  Mise à jour obligatoire
                </label>
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1">URL directe du fichier .exe (HTTPS)</label>
                <input
                  value={adminForm.download_url}
                  onChange={e => setAdminForm(f => ({ ...f, download_url: e.target.value }))}
                  className="erp-input w-full text-sm font-mono"
                  placeholder="https://…/Z&D-Thermoliner-Launcher-Setup.exe"
                />
                <p className="text-[10px] text-white/25 mt-1">
                  Hébergez le setup sur Supabase Storage, GitHub Releases ou votre serveur, puis collez l&apos;URL publique ici.
                </p>
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1">Notes de version</label>
                <textarea
                  value={adminForm.changelog}
                  onChange={e => setAdminForm(f => ({ ...f, changelog: e.target.value }))}
                  rows={3}
                  className="erp-input w-full text-sm resize-none"
                  placeholder="Nouveautés de cette version…"
                />
              </div>
              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold btn-primary text-white disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Publication…' : 'Publier pour tous les chauffeurs'}
              </button>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
