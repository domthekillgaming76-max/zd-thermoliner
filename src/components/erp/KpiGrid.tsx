import type { ReactNode } from 'react';

interface KpiGridProps {
  children: ReactNode;
  columns?: '2' | '3' | '4' | '5';
  className?: string;
}

const COLS = {
  '2': 'grid-cols-2',
  '3': 'grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-2 lg:grid-cols-4',
  '5': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
};

export function KpiGrid({ children, columns = '4', className = '' }: KpiGridProps) {
  return (
    <div className={`grid ${COLS[columns]} gap-3 md:gap-4 ${className}`}>
      {children}
    </div>
  );
}
