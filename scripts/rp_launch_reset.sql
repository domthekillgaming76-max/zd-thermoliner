-- Script manuel : lancement RP officiel Z&D Thermoliner
-- Usage : exécuter via Supabase SQL Editor OU via le bouton admin « Réinitialiser RP »
-- Prérequis : migration 058_rp_launch_reset.sql appliquée

-- 1) S'assurer que DOM76 a un profil chauffeur (rôle profil reste admin/pdg)
SELECT public.ensure_driver_from_profile(id)
FROM public.profiles
WHERE public.is_dom76_owner(email);

-- 2) Réinitialisation complète (confirmation requise côté RPC)
-- SELECT public.admin_reset_rp_economy('RESET RP');

-- Vérifications post-reset :
-- SELECT balance FROM public.company_bank_account;
-- SELECT SUM(total_km), SUM(deliveries_count) FROM public.drivers;
-- SELECT COUNT(*) FROM public.transactions;
-- SELECT COUNT(*) FROM public.road_sheets;
