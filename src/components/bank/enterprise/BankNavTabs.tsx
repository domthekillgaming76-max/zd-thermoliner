export type BankTabId =
  | 'dashboard'
  | 'transactions'
  | 'treasury'
  | 'transfers'
  | 'drivers'
  | 'settings';

interface BankNavTabsProps {
  active: BankTabId;
  onChange: (tab: BankTabId) => void;
}

const TABS: { id: BankTabId; label: string }[] = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'treasury', label: 'Trésorerie' },
  { id: 'transfers', label: 'Virements' },
  { id: 'drivers', label: 'Comptes chauffeurs' },
  { id: 'settings', label: 'Paramètres' },
];

export function BankNavTabs({ active, onChange }: BankNavTabsProps) {
  return (
    <nav className="bank-nav-tabs flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {TABS.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`bank-nav-tab px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
            active === tab.id ? 'bank-nav-tab-active' : ''
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
