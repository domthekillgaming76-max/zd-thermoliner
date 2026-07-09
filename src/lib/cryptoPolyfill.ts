function fallbackUuid(): string {
  return `zd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function safeRandomUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return fallbackUuid();
}

/** Patch crypto.randomUUID globally so third-party code cannot crash the app. */
export function installCryptoPolyfill(): void {
  try {
    const root = globalThis as typeof globalThis & { crypto?: Crypto };
    if (!root.crypto) {
      root.crypto = {} as Crypto;
    }
    if (typeof root.crypto.randomUUID !== 'function') {
      root.crypto.randomUUID = (() => safeRandomUUID()) as Crypto['randomUUID'];
    }
  } catch {
    /* never throw from polyfill */
  }
}
