-- Script manuel : lancement RP officiel Z&D Thermoliner
-- Prérequis : migrations 058 + 059 appliquées

-- 1) DOM76 admin + chauffeur
SELECT public.ensure_driver_from_profile(id)
FROM public.profiles
WHERE public.is_dom76_owner(email);

-- 2) Reset complet (mur conservé par défaut)
-- SELECT public.admin_reset_rp_economy('RESET RP', false, true);

-- 3) Reset avec suppression du mur société
-- SELECT public.admin_reset_rp_economy('RESET RP', true, true);

-- Vérifications post-reset :
-- SELECT balance FROM public.company_bank_account;
-- SELECT COALESCE(SUM(total_km),0), COALESCE(SUM(deliveries_count),0) FROM public.drivers;
-- SELECT COUNT(*) FROM public.transactions;
-- SELECT COUNT(*) FROM public.road_sheets;
-- SELECT COUNT(*) FROM public.freight_offers;
