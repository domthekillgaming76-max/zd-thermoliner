-- Personnalisation visuelle des salons de discussion.
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS icon text DEFAULT '💬',
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#ef4444';

ALTER TABLE public.chat_rooms
  DROP CONSTRAINT IF EXISTS chat_rooms_accent_color_format;
ALTER TABLE public.chat_rooms
  ADD CONSTRAINT chat_rooms_accent_color_format
  CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9a-fA-F]{6}$');

DROP POLICY IF EXISTS "update_chat_rooms" ON public.chat_rooms;
CREATE POLICY "update_chat_rooms" ON public.chat_rooms
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
