import { Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDriverHrFolder } from '../../hooks/useDriverHrFolder';
import { useRegenerateHrCard, useRegenerateHrContract } from '../../hooks/useDrivers';
import { canManageDriverHr, canViewHrFolder } from '../../lib/driverPermissions';
import { DriverHrFolder } from './DriverHrFolder';
import { EMPTY_DRIVER_HR_DOSSIER } from '../../lib/driverHrTypes';

interface DriverHrFolderSectionProps {
  userId?: string;
  profileRole?: string | null;
  email?: string | null;
  isOwnProfileContext?: boolean;
}

/**
 * Mount point for DriverHrFolder — loads driver record, ensures HR docs, renders folder.
 */
export function DriverHrFolderSection({
  userId: userIdProp,
  profileRole: roleProp,
  email: emailProp,
  isOwnProfileContext = true,
}: DriverHrFolderSectionProps = {}) {
  const { user, profile, isAdministrator } = useAuth();
  const userId = userIdProp ?? user?.id;
  const profileRole = roleProp ?? profile?.role ?? null;
  const email = emailProp ?? user?.email ?? profile?.email ?? null;

  const { data, isLoading, isError } = useDriverHrFolder(userId);
  const canManage = canManageDriverHr(profileRole, email);
  const driverId = data?.driver?.id ?? '';
  const regenerateContract = useRegenerateHrContract(driverId);
  const regenerateCard = useRegenerateHrCard(driverId);

  const canView = canViewHrFolder({
    viewerRole: profileRole,
    viewerEmail: email,
    viewerUserId: userId ?? null,
    driverUserId: data?.driver?.user_id ?? null,
    isOwnProfileContext,
    isAdministrator,
  });

  console.log('[HR Folder] render check', {
    currentUser: { id: userId, role: profileRole, email, isAdministrator },
    driver: data?.driver ?? null,
    canView,
  });

  if (!canView) return null;

  if (isLoading) {
    return (
      <div className="erp-card rounded-2xl p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-red-400" />
        <p className="text-sm text-white/40">Chargement du dossier chauffeur…</p>
      </div>
    );
  }

  if (isError || !data?.driver) {
    return (
      <div className="erp-card rounded-2xl p-8 border border-amber-500/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-white">Dossier chauffeur indisponible</h3>
            <p className="text-sm text-white/45 mt-1">
              Aucune fiche chauffeur liée à ce compte. Le dossier RH sera créé automatiquement dès que le profil chauffeur sera synchronisé.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DriverHrFolder
      driver={data.driver}
      dossier={data.dossier ?? EMPTY_DRIVER_HR_DOSSIER}
      canManage={canManage}
      onRegenerateContract={() => regenerateContract.mutate(data.driver)}
      onRegenerateCard={() => regenerateCard.mutate(data.driver)}
      regenerating={regenerateContract.isPending || regenerateCard.isPending}
    />
  );
}
