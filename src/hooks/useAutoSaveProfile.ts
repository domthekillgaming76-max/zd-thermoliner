import { useCallback, useEffect, useRef, useState } from 'react';
import { saveUserProfile, toProfileError, type NormalizedProfile } from '../services/profileService';
import type { ProfileCustomizationForm } from '../lib/profileThemes';

export type AutoSaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 700;

export function useAutoSaveProfile(options: {
  form: ProfileCustomizationForm;
  userId: string | undefined;
  email: string;
  customizationAvailable: boolean;
  enabled: boolean;
  onSaved: (profile: NormalizedProfile) => void;
}) {
  const { form, userId, email, customizationAvailable, enabled, onSaved } = options;
  const [saveState, setSaveState] = useState<AutoSaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const skipSaveRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef(form);
  formRef.current = form;

  const resetSkip = useCallback(() => {
    skipSaveRef.current = true;
    setSaveState('idle');
    setSaveError(null);
  }, []);

  useEffect(() => {
    if (!enabled || !userId) return;

    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }

    setSaveState('pending');
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setSaveState('saving');
      setSaveError(null);
      try {
        console.log('[Z&D] Auto-save profile triggered', { userId });
        const updated = await saveUserProfile(
          userId,
          email,
          formRef.current,
          customizationAvailable,
        );
        onSaved(updated);
        setSaveState('saved');
      } catch (err) {
        const message = toProfileError(err).message;
        console.error('[Z&D] Auto-save profile failed', err);
        setSaveError(message);
        setSaveState('error');
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [form, userId, email, customizationAvailable, enabled, onSaved]);

  const saveNow = useCallback(async () => {
    if (!userId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveState('saving');
    setSaveError(null);
    try {
      const updated = await saveUserProfile(userId, email, formRef.current, customizationAvailable);
      onSaved(updated);
      setSaveState('saved');
    } catch (err) {
      const message = toProfileError(err).message;
      setSaveError(message);
      setSaveState('error');
      throw toProfileError(err);
    }
  }, [userId, email, customizationAvailable, onSaved]);

  return { saveState, saveError, saveNow, resetSkip };
}
