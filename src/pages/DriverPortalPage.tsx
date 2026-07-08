import { useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Loader2, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDriverPortal } from '../hooks/useDriverPortal';
import { canViewAllDriverPortalActivity } from '../lib/driverPortalPermissions';
import type { DriverPortalTab } from '../lib/driverPortalTypes';
import { FormAlert, FormSuccess } from '../components/erp/FormAlert';
import { DriverPortalLayout } from '../components/driver-portal/DriverPortalLayout';
import { DriverHomePanel } from '../components/driver-portal/DriverHomePanel';
import { DriverMissionsPanel } from '../components/driver-portal/DriverMissionsPanel';
import { DriverMobileRoadSheetForm } from '../components/driver-portal/DriverMobileRoadSheetForm';
import { DriverDocumentsPanel } from '../components/driver-portal/DriverDocumentsPanel';
import { DriverHrFolderSection } from '../components/drivers/DriverHrFolderSection';
import { canViewOwnHrFolderOnProfile } from '../lib/driverPermissions';
import type { RoadSheetFormData } from '../services/roadSheetService';
import { uploadDeliveryProof } from '../services/driverPortalService';

function resolvePortalTab(param: string | null): DriverPortalTab {
  if (param === 'dossier' || param === 'hr_folder') return 'hr_folder';
  if (param === 'missions') return 'missions';
  if (param === 'sheet' || param === 'feuille') return 'sheet';
  if (param === 'docs' || param === 'documents') return 'docs';
  return 'home';
}

export function DriverPortalPage() {
  const { user, profile, isAdministrator } = useAuth();
  const [searchParams] = useSearchParams();
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<DriverPortalTab>(() => resolvePortalTab(searchParams.get('tab')));
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [highlightPayslip, setHighlightPayslip] = useState(false);
  const [pendingMissionId, setPendingMissionId] = useState<string | undefined>();

  useEffect(() => {
    const next = resolvePortalTab(searchParams.get('tab'));
    setTab(next);
  }, [searchParams]);

  const {
    data,
    isLoading,
    isError,
    error,
    startMission,
    finishMission,
    submitSheet,
    reportIssue,
    messageAdmin,
    uploadProof,
  } = useDriverPortal(user?.id, profile?.role, user?.email ?? profile?.email);

  const busy =
    startMission.isPending ||
    finishMission.isPending ||
    submitSheet.isPending ||
    reportIssue.isPending ||
    messageAdmin.isPending ||
    uploadProof.isPending;

  const isAdminView = canViewAllDriverPortalActivity(profile?.role, user?.email ?? profile?.email);

  const canViewHr = canViewOwnHrFolderOnProfile(
    profile?.role,
    user?.email ?? profile?.email,
    true,
    isAdministrator,
  );

  console.log('[HR Folder] render check', {
    currentUser: { id: user?.id, role: profile?.role, email: user?.email, isAdministrator },
    driver: data?.home ? { driverId: data.home.driverId, driverName: data.home.driverName } : null,
    canView: canViewHr,
  });

  async function handleAction(action: string, payload?: string) {
    setPageError(null);
    setSuccessMessage(null);

    try {
      switch (action) {
        case 'start':
          if (payload) {
            await startMission.mutateAsync(payload);
            setSuccessMessage('Mission démarrée.');
          }
          break;
        case 'finish':
          if (payload) {
            await finishMission.mutateAsync(payload);
            setSuccessMessage('Mission terminée.');
          }
          break;
        case 'sheet':
          setTab('sheet');
          break;
        case 'proof':
          setPendingMissionId(data?.home.todayMission?.id);
          proofInputRef.current?.click();
          break;
        case 'issue': {
          const parsed = payload ? JSON.parse(payload) as { title: string; description: string } : null;
          if (parsed) {
            await reportIssue.mutateAsync(parsed);
            setSuccessMessage('Problème signalé à l\'administration.');
          }
          break;
        }
        case 'contact':
          if (payload) {
            await messageAdmin.mutateAsync(payload);
            setSuccessMessage('Message envoyé.');
          }
          break;
        case 'payslip':
          setHighlightPayslip(true);
          setTab('hr_folder');
          setTimeout(() => setHighlightPayslip(false), 3000);
          break;
        default:
          break;
      }
    } catch (err) {
      setPageError((err as Error).message);
    }
  }

  async function handleSheetSubmit(form: RoadSheetFormData, photoFile: File | null) {
    setPageError(null);
    try {
      await submitSheet.mutateAsync(form);
      if (photoFile && data?.home.driverId && user?.id) {
        await uploadDeliveryProof(user.id, data.home.driverId, photoFile);
      }
      setSuccessMessage('Feuille de route soumise — en attente de validation DOM76.');
      setTab('home');
    } catch (err) {
      setPageError((err as Error).message);
    }
  }

  async function handleProofFile(file: File | null) {
    if (!file) return;
    setPageError(null);
    try {
      await uploadProof.mutateAsync({ file, missionId: pendingMissionId });
      setSuccessMessage('Preuve de livraison envoyée.');
    } catch (err) {
      setPageError((err as Error).message);
    }
  }

  if (isLoading) {
    return (
      <DriverPortalLayout tab={tab} onTabChange={setTab}>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
          <p className="text-sm text-white/40">Chargement du portail...</p>
        </div>
      </DriverPortalLayout>
    );
  }

  if (isError || !data) {
    return (
      <DriverPortalLayout tab={tab} onTabChange={setTab}>
        <div className="driver-portal-glass rounded-2xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-white/60">{(error as Error)?.message ?? 'Impossible de charger le portail.'}</p>
        </div>
      </DriverPortalLayout>
    );
  }

  return (
    <DriverPortalLayout
      tab={tab}
      onTabChange={setTab}
      driverName={data.home.driverName}
      showHrFolder={canViewHr}
    >
      <input
        ref={proofInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => void handleProofFile(e.target.files?.[0] ?? null)}
      />

      {isAdminView && (
        <div className="driver-portal-alert rounded-xl px-3 py-2 mb-4 text-xs text-amber-300 flex items-center gap-2">
          <Smartphone className="w-4 h-4 shrink-0" />
          Vue administrateur — activité de tous les chauffeurs visible.
        </div>
      )}

      {data.migrationRequired && (
        <div className="driver-portal-alert rounded-xl px-3 py-2 mb-4 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Migration 037 requise — exécutez <code className="text-red-300">npx supabase db push</code>
        </div>
      )}

      {pageError && <FormAlert message={pageError} onDismiss={() => setPageError(null)} />}
      {successMessage && <FormSuccess message={successMessage} onDismiss={() => setSuccessMessage(null)} />}

      {tab === 'home' && (
        <DriverHomePanel data={data} onAction={handleAction} busy={busy} />
      )}
      {tab === 'missions' && <DriverMissionsPanel missions={data.missions} />}
      {tab === 'sheet' && (
        <DriverMobileRoadSheetForm
          home={data.home}
          saving={submitSheet.isPending}
          onSubmit={handleSheetSubmit}
        />
      )}
      {tab === 'docs' && (
        <DriverDocumentsPanel
          documents={data.documents}
          payslips={data.payslips}
          highlightPayslip={highlightPayslip}
        />
      )}
      {tab === 'hr_folder' && canViewHr && (
        <div className={highlightPayslip ? 'ring-2 ring-red-500/30 rounded-2xl' : ''}>
          <DriverHrFolderSection isOwnProfileContext />
        </div>
      )}
    </DriverPortalLayout>
  );
}
