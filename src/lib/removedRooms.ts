/** Salons retirés de l'ERP, y compris lorsque d'anciennes lignes existent encore en base. */
export const REMOVED_ROOM_KEYS = new Set([
  'invoices',
  'dispatch',
  'gps_tracking',
  'fleet_map',
  'driver_portal',
  'client_launcher',
]);

export function isRemovedRoomKey(key: string): boolean {
  return REMOVED_ROOM_KEYS.has(key);
}
