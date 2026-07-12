import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import {

  User, Camera, Save, Palette, Truck, Globe, MessageCircle,

  Layers, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Upload, FolderOpen, CreditCard, LayoutGrid, ArrowLeft,

} from 'lucide-react';

import { Layout } from '../components/Layout';

import { PageHeader } from '../components/erp/PageHeader';

import { FormAlert, FormSuccess } from '../components/erp/FormAlert';

import { UserBadges } from '../components/erp/UserBadges';
import { AppUpdateProfileCard } from '../components/AppUpdateProfileCard';

import { ProfilePreview } from '../components/profile/ProfilePreview';
import { ProfileOverviewTab } from '../components/profile/ProfileOverviewTab';
import { useProfilePosts } from '../hooks/useProfilePosts';

import { useAuth } from '../contexts/AuthContext';

import type { NormalizedProfile } from '../services/profileService';
import { fetchUserProfile } from '../services/profileService';

import { fetchProfileCardStats, type ProfileCardStats } from '../services/profileStatsService';

import { useAutoSaveProfile } from '../hooks/useAutoSaveProfile';

import {

  PROFILE_THEMES,

  BACKGROUND_STYLES,

  CARD_STYLES,

  applyThemeToForm,

  profileToForm,

  type ProfileCustomizationForm,

  type ProfileThemeKey,

} from '../lib/profileThemes';

import { RoleBadge } from '../components/erp/RoleBadge';
import { DriverHrFolderSection } from '../components/drivers/DriverHrFolderSection';
import { DriverBankPanel } from '../components/driver-bank/DriverBankPanel';
import { useDriverBank } from '../hooks/useDriverBank';
import { canViewOwnHrFolderOnProfile } from '../lib/driverPermissions';



type ProfilePageTab = 'overview' | 'settings' | 'hr_folder' | 'bank_account';

function Section({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {

  return (

    <section className="erp-card rounded-2xl p-5 space-y-4">

      <h2 className="text-sm font-bold text-white flex items-center gap-2">

        <Icon className="w-4 h-4 text-red-400" />

        {title}

      </h2>

      {children}

    </section>

  );

}



function Field({ label, children }: { label: string; children: React.ReactNode }) {

  return (

    <div>

      <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-1.5">{label}</label>

      {children}

    </div>

  );

}



function ProfileHrFolderMount() {
  useEffect(() => {
    console.log('[HR Folder] mounted in real ProfilePage');
  }, []);
  return <DriverHrFolderSection isOwnProfileContext />;
}

function SaveStatus({ state, error }: { state: string; error: string | null }) {

  if (state === 'saving' || state === 'pending') {

    return (

      <span className="inline-flex items-center gap-1.5 text-xs text-white/40">

        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enregistrement…

      </span>

    );

  }

  if (state === 'saved') {

    return (

      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">

        <CheckCircle2 className="w-3.5 h-3.5" /> Profil enregistré avec succès.

      </span>

    );

  }

  if (state === 'error' && error) {

    return <span className="text-xs text-red-400">{error}</span>;

  }

  return (

    <span className="inline-flex items-center gap-1.5 text-xs text-white/25">

      <Upload className="w-3.5 h-3.5" /> Modifications enregistrées automatiquement

    </span>

  );

}



export function ProfilePage() {
  const { userId: routeUserId } = useParams<{ userId?: string }>();

  const {

    profile,

    user,

    loading,

    profileError,

    profileCustomizationAvailable,

    refreshProfile,

    signOut,

    isAdministrator,

  } = useAuth();

  const isViewingOther = Boolean(
    routeUserId && routeUserId !== 'me' && routeUserId !== user?.id,
  );
  const targetUserId = isViewingOther ? routeUserId! : user?.id;

  const [viewedProfile, setViewedProfile] = useState<NormalizedProfile | null>(null);
  const [viewedProfileError, setViewedProfileError] = useState<string | null>(null);
  const [viewedProfileLoading, setViewedProfileLoading] = useState(false);

  const activeProfile = isViewingOther ? viewedProfile : profile;

  const [form, setForm] = useState<ProfileCustomizationForm>(() => profileToForm(profile));

  const [stats, setStats] = useState<ProfileCardStats>({

    totalKm: 0,

    deliveries: 0,

    revenueGenerated: 0,

    hasDriverRecord: false,

  });

  const [refreshing, setRefreshing] = useState(false);

  const [manualError, setManualError] = useState<string | null>(null);

  const [flashSuccess, setFlashSuccess] = useState<string | null>(null);

  const [pageTab, setPageTab] = useState<ProfilePageTab>(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t === 'dossier' || t === 'hr_folder') return 'hr_folder';
    if (t === 'bank' || t === 'bank_account') return 'bank_account';
    if (t === 'settings' || t === 'personnalisation') return 'settings';
    return 'overview';
  });

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'dossier' || t === 'hr_folder') setPageTab('hr_folder');
    else if (t === 'bank' || t === 'bank_account') setPageTab('bank_account');
    else if (t === 'settings' || t === 'personnalisation') setPageTab('settings');
    else if (t === 'overview' || t === 'feed') setPageTab('overview');
  }, [searchParams]);

  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const {
    data: postsBundle,
    isLoading: postsLoading,
    create: createPost,
    remove: removePost,
  } = useProfilePosts(targetUserId);

  useEffect(() => {
    if (!isViewingOther || !routeUserId) {
      setViewedProfile(null);
      setViewedProfileError(null);
      setViewedProfileLoading(false);
      return;
    }

    let cancelled = false;
    setViewedProfileLoading(true);
    setViewedProfileError(null);

    void fetchUserProfile(routeUserId).then(result => {
      if (cancelled) return;
      if (result.profile) {
        setViewedProfile(result.profile);
        setForm(profileToForm(result.profile));
      } else {
        setViewedProfile(null);
        setViewedProfileError(result.error ?? 'Profil introuvable.');
      }
      setViewedProfileLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isViewingOther, routeUserId]);

  useEffect(() => {
    if (isViewingOther && pageTab !== 'overview') {
      setPageTab('overview');
    }
  }, [isViewingOther, pageTab]);



  const onProfileSaved = useCallback((updated: NormalizedProfile) => {

    setForm(profileToForm(updated));

    setFlashSuccess('Profil enregistré avec succès.');

    const t = setTimeout(() => setFlashSuccess(null), 3500);

    void refreshProfile();

    void fetchProfileCardStats(updated.id).then(setStats);

    return () => clearTimeout(t);

  }, [refreshProfile]);



  const { saveState, saveError, saveNow, resetSkip } = useAutoSaveProfile({

    form,

    userId: user?.id,

    email: user?.email ?? profile?.email ?? '',

    customizationAvailable: profileCustomizationAvailable,

    enabled: Boolean(!isViewingOther && profile && user),

    onSaved: onProfileSaved,

  });



  useEffect(() => {

    if (profile && !isViewingOther) {

      resetSkip();

      setForm(profileToForm(profile));

    }

  }, [profile?.id, profile?.updated_at, resetSkip, isViewingOther]);



  useEffect(() => {

    if (!targetUserId) return;

    void fetchProfileCardStats(targetUserId).then(setStats);

  }, [targetUserId, profile?.updated_at, viewedProfile?.updated_at]);

  const { data: bankBundle, isLoading: bankLoading } = useDriverBank(isViewingOther ? undefined : user?.id);

  function setField<K extends keyof ProfileCustomizationForm>(key: K, value: ProfileCustomizationForm[K]) {

    setManualError(null);

    setForm(prev => ({ ...prev, [key]: value }));

  }



  function selectTheme(themeKey: ProfileThemeKey) {

    setForm(prev => applyThemeToForm(prev, themeKey));

  }



  async function handleSaveNow(e: React.FormEvent) {

    e.preventDefault();

    if (!user || !profile) return;

    setManualError(null);

    try {

      await saveNow();

    } catch (err) {

      setManualError(err instanceof Error ? err.message : 'Impossible d\'enregistrer le profil.');

    }

  }



  async function handleRetryLoad() {

    setRefreshing(true);

    setManualError(null);

    try {

      await refreshProfile();

    } finally {

      setRefreshing(false);

    }

  }



  if (loading || (isViewingOther && viewedProfileLoading)) {

    return (

      <Layout>

        <div className="flex flex-col items-center justify-center py-24 gap-3">

          <Loader2 className="w-8 h-8 animate-spin text-red-400" />

          <p className="text-sm text-white/40">Chargement du profil…</p>

        </div>

      </Layout>

    );

  }



  if (!activeProfile) {

    const loadError = isViewingOther ? viewedProfileError : profileError;

    return (

      <Layout>

        <div className="space-y-6 max-w-2xl mx-auto">

          <PageHeader
            title={isViewingOther ? 'Profil membre' : 'Mon profil'}
            subtitle={isViewingOther ? 'Consultation du profil' : 'Personnalisez votre identité Z&D Thermoliner'}
            icon={User}
          />

          {isViewingOther && (
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 text-xs font-semibold text-white/45 hover:text-red-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à mon profil
            </Link>
          )}

          <div className="erp-card rounded-2xl p-6 space-y-4 border border-red-500/20">

            <div className="flex items-start gap-3">

              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />

              <div>

                <h2 className="text-sm font-bold text-white">Impossible de charger le profil</h2>

                <p className="text-sm text-white/50 mt-1">

                  {loadError ?? 'Une erreur inconnue est survenue.'}

                </p>

              </div>

            </div>

            {!isViewingOther && (
              <button type="button" onClick={handleRetryLoad} disabled={refreshing}
                className="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50">

                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}

                Réessayer

              </button>
            )}

          </div>

        </div>

      </Layout>

    );

  }



  const displayError = manualError ?? (saveState === 'error' ? saveError : null);
  const memberDisplayName = activeProfile.pseudo || activeProfile.full_name || 'Membre';
  const showHrFolder = !isViewingOther && canViewOwnHrFolderOnProfile(
    activeProfile.role,
    activeProfile.email ?? user?.email,
    stats.hasDriverRecord,
    isAdministrator,
  );

  return (

    <Layout>

      <div className="space-y-6 max-w-6xl mx-auto profile-module">

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">

          <div className="space-y-2">
            {isViewingOther && (
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 text-xs font-semibold text-white/45 hover:text-red-400 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour à mon profil
              </Link>
            )}
            <PageHeader

              title={isViewingOther ? `Profil de ${memberDisplayName}` : 'Mon profil'}

              subtitle={
                isViewingOther
                  ? 'Fil photo et identité du membre'
                  : "Fil d'actualité, widgets et identité Z&D Thermoliner"
              }

              icon={User}

            />
          </div>

          {!isViewingOther && <SaveStatus state={saveState} error={saveError} />}

        </div>



        {displayError && <FormAlert message={displayError} onDismiss={() => setManualError(null)} />}

        {flashSuccess && <FormSuccess message={flashSuccess} onDismiss={() => setFlashSuccess(null)} />}

        {!isViewingOther && <AppUpdateProfileCard />}

        {!isViewingOther && !profileCustomizationAvailable && (

          <FormAlert message="Champs de personnalisation non disponibles — exécutez npx supabase db push (migration 026) pour activer bio, thème et bannière." />

        )}



        <nav className="flex gap-1 overflow-x-auto pb-1 profile-tab-nav">

          <button
            type="button"
            onClick={() => setPageTab('overview')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              pageTab === 'overview'
                ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                : 'text-white/35 hover:bg-white/5 border border-transparent'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Vue d&apos;ensemble
          </button>

          {!isViewingOther && (
            <>
          <button
            type="button"
            onClick={() => setPageTab('settings')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              pageTab === 'settings'
                ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                : 'text-white/35 hover:bg-white/5 border border-transparent'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Personnalisation
          </button>

          {showHrFolder && (
            <>
            <button

              type="button"

              onClick={() => setPageTab('hr_folder')}

              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${

                pageTab === 'hr_folder'

                  ? 'bg-red-500/15 text-red-400 border border-red-500/25'

                  : 'text-white/35 hover:bg-white/5 border border-transparent'

              }`}

            >

              <FolderOpen className="w-3.5 h-3.5" />

              Dossier Chauffeur

            </button>

            <button

              type="button"

              onClick={() => setPageTab('bank_account')}

              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${

                pageTab === 'bank_account'

                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'

                  : 'text-white/35 hover:bg-white/5 border border-transparent'

              }`}

            >

              <CreditCard className="w-3.5 h-3.5" />

              Mon compte bancaire

            </button>
            </>
          )}
            </>
          )}

        </nav>



        {pageTab === 'overview' && (
          <ProfileOverviewTab
            profile={activeProfile}
            stats={stats}
            form={form}
            isAdmin={isAdministrator}
            userId={user?.id}
            canEdit={!isViewingOther}
            posts={postsBundle?.posts ?? []}
            postsLoading={postsLoading}
            postsMigrationRequired={postsBundle?.migrationRequired}
            posting={createPost.isPending}
            deletingPostId={deletingPostId}
            onCreatePost={!isViewingOther ? async input => {
              setManualError(null);
              try {
                await createPost.mutateAsync(input);
                setFlashSuccess('Publication ajoutée à votre fil.');
              } catch (err) {
                setManualError(err instanceof Error ? err.message : 'Impossible de publier.');
              }
            } : undefined}
            onDeletePost={!isViewingOther ? async id => {
              setDeletingPostId(id);
              setManualError(null);
              try {
                await removePost.mutateAsync(id);
                setFlashSuccess('Publication supprimée.');
              } catch (err) {
                setManualError(err instanceof Error ? err.message : 'Suppression impossible.');
              } finally {
                setDeletingPostId(null);
              }
            } : undefined}
          />
        )}



        {pageTab === 'hr_folder' && showHrFolder ? (

          <ProfileHrFolderMount />

        ) : pageTab === 'bank_account' && showHrFolder ? (

          <DriverBankPanel bundle={bankBundle} loading={bankLoading} />

        ) : pageTab === 'settings' && !isViewingOther ? (

        <>

        <div className="grid xl:grid-cols-[1fr_340px] gap-6 items-start">

          <form onSubmit={handleSaveNow} className="space-y-4">

            <Section title="Informations" icon={User}>

              <div className="grid sm:grid-cols-2 gap-4">

                <Field label="Nom complet">

                  <input className="erp-input w-full" value={form.full_name} onChange={e => setField('full_name', e.target.value)} required />

                </Field>

                <Field label="Pseudo">

                  <input className="erp-input w-full" value={form.pseudo} onChange={e => setField('pseudo', e.target.value)} placeholder="DomD76" />

                </Field>

                <Field label="Bio">

                  <textarea className="erp-input w-full min-h-[80px] sm:col-span-2" value={form.bio} onChange={e => setField('bio', e.target.value)} />

                </Field>

                <Field label="Pays">

                  <input className="erp-input w-full" value={form.country} onChange={e => setField('country', e.target.value)} />

                </Field>

                <Field label="Grade">

                  <div className="erp-input w-full flex items-center gap-2 bg-white/[0.02] cursor-not-allowed opacity-80">

                    {isAdministrator ? (
                      <UserBadges
                        isAdministrator={isAdministrator}
                        role={activeProfile.role}
                        email={activeProfile.email}
                        size="sm"
                      />
                    ) : (
                      <RoleBadge role={activeProfile.role} size="sm" />
                    )}

                  </div>

                </Field>

              </div>

            </Section>



            <Section title="Réseaux & jeu" icon={MessageCircle}>

              <div className="grid sm:grid-cols-2 gap-4">

                <Field label="Discord">

                  <input className="erp-input w-full" value={form.discord_name} onChange={e => setField('discord_name', e.target.value)} />

                </Field>

                <Field label="TruckersMP ID">

                  <input className="erp-input w-full" value={form.truckersmp_id} onChange={e => setField('truckersmp_id', e.target.value)} />

                </Field>

                <Field label="Camion favori">

                  <input className="erp-input w-full" value={form.favorite_truck} onChange={e => setField('favorite_truck', e.target.value)} />

                </Field>

                <Field label="Remorque favorite">

                  <input className="erp-input w-full" value={form.favorite_trailer} onChange={e => setField('favorite_trailer', e.target.value)} />

                </Field>

              </div>

            </Section>



            <Section title="Avatar & camion" icon={Camera}>

              <div className="space-y-4">

                <Field label="Avatar URL">

                  <input className="erp-input w-full" value={form.avatar_url} onChange={e => setField('avatar_url', e.target.value)} placeholder="https://..." />

                </Field>

                <Field label="Photo camion URL">

                  <input className="erp-input w-full" value={form.truck_photo_url} onChange={e => setField('truck_photo_url', e.target.value)} placeholder="https://..." />

                </Field>

                <Field label="Bannière URL">

                  <input className="erp-input w-full" value={form.banner_url} onChange={e => setField('banner_url', e.target.value)} placeholder="https://..." />

                </Field>

              </div>

            </Section>



            <Section title="Thème camion" icon={Truck}>

              <div className="grid sm:grid-cols-2 gap-2">

                {(Object.keys(PROFILE_THEMES) as ProfileThemeKey[]).map(key => {

                  const t = PROFILE_THEMES[key];

                  const active = form.profile_theme === key;

                  return (

                    <button key={key} type="button" onClick={() => selectTheme(key)}

                      className={`rounded-xl p-3 text-left border transition-all ${active ? 'border-white/25 bg-white/[0.06]' : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}>

                      <div className="h-8 rounded-lg mb-2" style={{ background: t.bannerGradient }} />

                      <p className="text-xs font-semibold text-white">{t.name}</p>

                    </button>

                  );

                })}

              </div>

            </Section>



            <Section title="Couleurs & style" icon={Palette}>

              <div className="grid sm:grid-cols-2 gap-4">

                <Field label="Couleur primaire">

                  <div className="flex gap-2">

                    <input type="color" value={form.primary_color} onChange={e => setField('primary_color', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />

                    <input className="erp-input flex-1" value={form.primary_color} onChange={e => setField('primary_color', e.target.value)} />

                  </div>

                </Field>

                <Field label="Couleur secondaire">

                  <div className="flex gap-2">

                    <input type="color" value={form.secondary_color} onChange={e => setField('secondary_color', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />

                    <input className="erp-input flex-1" value={form.secondary_color} onChange={e => setField('secondary_color', e.target.value)} />

                  </div>

                </Field>

                <Field label="Style de fond">

                  <select className="erp-select w-full" value={form.background_style} onChange={e => setField('background_style', e.target.value as ProfileCustomizationForm['background_style'])}>

                    {BACKGROUND_STYLES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}

                  </select>

                </Field>

                <Field label="Style des cartes">

                  <select className="erp-select w-full" value={form.card_style} onChange={e => setField('card_style', e.target.value as ProfileCustomizationForm['card_style'])}>

                    {CARD_STYLES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}

                  </select>

                </Field>

              </div>

            </Section>



            <button type="submit" disabled={saveState === 'saving'}

              className="w-full btn-primary py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">

              {saveState === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}

              Enregistrer maintenant

            </button>

          </form>



          <div className="xl:sticky xl:top-4 space-y-4">

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/30">

              <Layers className="w-3.5 h-3.5" />

              Aperçu en direct

            </div>

            <ProfilePreview form={form} role={activeProfile.role} email={activeProfile.email} isAdmin={isAdministrator} />

          </div>

        </div>



        <section className="erp-card rounded-2xl p-5">

          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">

            <Globe className="w-4 h-4 text-red-400" />

            Compte

          </h2>

          <p className="text-sm text-white/40 mb-4">{activeProfile.email}</p>

          <button type="button" onClick={signOut}

            className="w-full max-w-xs py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors">

            Se déconnecter

          </button>

        </section>

        </>

        ) : null}



      </div>

    </Layout>

  );

}

