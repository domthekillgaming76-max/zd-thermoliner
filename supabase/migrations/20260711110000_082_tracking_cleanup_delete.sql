-- 082 — GPS tracking : autoriser la suppression des fiches fret (salon épuré)

DROP POLICY IF EXISTS "delivery_tracking_delete" ON public.delivery_tracking;
CREATE POLICY "delivery_tracking_delete" ON public.delivery_tracking
  FOR DELETE TO authenticated
  USING (public.is_tracking_manager(auth.uid()));

COMMENT ON POLICY "delivery_tracking_delete" ON public.delivery_tracking IS
  'Admin / gestionnaire tracking — suppression fret livré ou nettoyage salon';
