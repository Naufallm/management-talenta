import type { ReactNode } from 'react';

export function FilterBar({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`filter-bar ${className}`} role="group" aria-label={label}>
      {children}
    </div>
  );
}
