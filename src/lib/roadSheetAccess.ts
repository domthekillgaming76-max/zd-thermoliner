import type { RoadSheet } from './supabase';

export const ROAD_SHEET_VALIDATOR_ERROR = 'Seul DOM76 peut valider une feuille de route.';

export interface RoadSheetApproverProfile {
  id: string;
  role: string;
  pseudo: string | null;
}

export function canApproveRoadSheets(profile: RoadSheetApproverProfile | null | undefined): boolean {
  if (!profile?.id) return false;
  if (profile.role === 'admin') return true;
  return (profile.pseudo ?? '').trim().toLowerCase() === 'dom76';
}

export function isRoadSheetValidated(sheet: RoadSheet): boolean {
  return sheet.validated === true || sheet.status === 'approved' || sheet.status === 'validated';
}

export function isRoadSheetLocked(sheet: RoadSheet): boolean {
  return isRoadSheetValidated(sheet);
}

export function isRoadSheetPending(sheet: RoadSheet): boolean {
  return !isRoadSheetLocked(sheet) && sheet.status !== 'rejected';
}

export function userOwnsRoadSheet(
  sheet: RoadSheet,
  userId: string,
  linkedDriverIds: string[] = [],
): boolean {
  if (sheet.driver_user_id === userId) return true;
  if (sheet.driver_id && linkedDriverIds.includes(sheet.driver_id)) return true;
  return false;
}

export function canUserEditRoadSheet(
  sheet: RoadSheet,
  userId: string,
  isAdmin: boolean,
  linkedDriverIds: string[] = [],
): boolean {
  if (isRoadSheetLocked(sheet)) return false;
  if (isAdmin) return true;
  return isRoadSheetPending(sheet) && userOwnsRoadSheet(sheet, userId, linkedDriverIds);
}
