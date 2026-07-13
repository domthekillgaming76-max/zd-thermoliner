-- 090 — Retirer les salons abandonnés de la navigation dynamique.
DELETE FROM public.room_permissions
WHERE room_key IN (
  'invoices',
  'dispatch',
  'gps_tracking',
  'fleet_map',
  'driver_portal',
  'client_launcher'
);

DELETE FROM public.app_modules
WHERE key IN (
  'invoices',
  'dispatch',
  'gps_tracking',
  'fleet_map',
  'driver_portal',
  'client_launcher'
);
