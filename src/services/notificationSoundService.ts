import type { NotificationType } from './notificationService';

const PREFS_KEY = 'zd_erp_settings';

export type NotificationSoundKind = 'wall' | 'bank';
let sharedAudioContext: AudioContext | null = null;

interface SoundPrefs {
  notifications?: boolean;
  notificationSounds?: boolean;
  wallSounds?: boolean;
  bankSounds?: boolean;
}

function readSoundPrefs(): Required<SoundPrefs> {
  const defaults = {
    notifications: true,
    notificationSounds: true,
    wallSounds: true,
    bankSounds: true,
  };
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as SoundPrefs;
    return { ...defaults, ...stored };
  } catch {
    return defaults;
  }
}

function kindForType(type: NotificationType | string): NotificationSoundKind | null {
  if (type.startsWith('wall_') || type === 'announcement') return 'wall';
  return null;
}

function tone(
  context: AudioContext,
  destination: AudioNode,
  frequency: number,
  startsAt: number,
  duration: number,
  volume: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.03);
}

/** Carillon synthétisé court, sans fichier audio externe. */
export async function playNotificationSound(kind: NotificationSoundKind, force = false): Promise<void> {
  const prefs = readSoundPrefs();
  if (!force && (!prefs.notifications || !prefs.notificationSounds)) return;
  if (!force && kind === 'wall' && !prefs.wallSounds) return;
  if (!force && kind === 'bank' && !prefs.bankSounds) return;
  if (typeof window === 'undefined' || !window.AudioContext) return;

  try {
    const context = sharedAudioContext ?? new AudioContext();
    sharedAudioContext = context;
    if (context.state === 'suspended') await context.resume();
    if (context.state !== 'running') return;
    const master = context.createGain();
    master.gain.value = 0.55;
    master.connect(context.destination);
    const now = context.currentTime + 0.015;

    if (kind === 'wall') {
      tone(context, master, 659.25, now, 0.28, 0.07);
      tone(context, master, 880, now + 0.13, 0.38, 0.055);
    } else {
      tone(context, master, 523.25, now, 0.3, 0.065);
      tone(context, master, 659.25, now + 0.12, 0.34, 0.06);
      tone(context, master, 783.99, now + 0.25, 0.48, 0.05);
    }

  } catch {
    // Le navigateur peut bloquer l’audio avant la première interaction.
  }
}

/** Déverrouille Web Audio au premier clic/toucher pour les futures alertes automatiques. */
export function primeNotificationAudio(): void {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  try {
    sharedAudioContext ??= new AudioContext();
    if (sharedAudioContext.state === 'suspended') void sharedAudioContext.resume();
  } catch {
    // Les notifications visuelles continuent si l’audio n’est pas disponible.
  }
}

export function playSoundForNotification(type: NotificationType | string): void {
  const kind = kindForType(type);
  if (kind) void playNotificationSound(kind);
}
