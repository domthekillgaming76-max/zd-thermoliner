-- 085 — Masquer le salon Client Windows pour les visiteurs

UPDATE public.room_permissions
SET
  visible_to_roles = ARRAY['chauffeur', 'admin'],
  updated_at = now()
WHERE room_key = 'client_launcher';
