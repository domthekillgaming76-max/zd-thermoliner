export interface BankSettings {
  ibanDisplay: string;
  bankLogo: 'zd' | 'teal' | 'green';
  dailyPaymentLimit: number;
  monthlyPaymentLimit: number;
  cardsEnabled: boolean;
  twoFactorEnabled: boolean;
  notifyIncoming: boolean;
  notifyOutgoing: boolean;
  notifyRoadSheet: boolean;
  notifySalary: boolean;
  notifyLoan: boolean;
}

const STORAGE_KEY = 'zd-bank-settings';

export const DEFAULT_BANK_SETTINGS: BankSettings = {
  ibanDisplay: '',
  bankLogo: 'zd',
  dailyPaymentLimit: 5000,
  monthlyPaymentLimit: 50000,
  cardsEnabled: true,
  twoFactorEnabled: true,
  notifyIncoming: true,
  notifyOutgoing: true,
  notifyRoadSheet: true,
  notifySalary: true,
  notifyLoan: true,
};

export function loadBankSettings(): BankSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BANK_SETTINGS };
    return { ...DEFAULT_BANK_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_BANK_SETTINGS };
  }
}

export function saveBankSettings(settings: BankSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
