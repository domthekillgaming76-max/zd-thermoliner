import { safeRandomUUID } from './cryptoPolyfill';

export function safeUuid(): string {
  return safeRandomUUID();
}
