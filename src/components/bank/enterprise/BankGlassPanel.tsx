import type { ReactNode } from 'react';

interface BankGlassPanelProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function BankGlassPanel({ children, className = '', delay = 0 }: BankGlassPanelProps) {
  return (
    <div
      className={`bank-glass-panel bank-fade-in rounded-2xl ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
