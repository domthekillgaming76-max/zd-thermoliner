import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BACKUP_INTERVAL_MS, runAutoBackup } from '../services/backupService';

export function useErpAutoBackup() {
  const { user, isAdministrator } = useAuth();

  useEffect(() => {
    if (!user) return;

    void runAutoBackup(isAdministrator);

    const id = window.setInterval(() => {
      void runAutoBackup(isAdministrator);
    }, BACKUP_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [user, isAdministrator]);
}
