import type { ReactNode } from 'react';

export function QaChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-border px-1.5 text-caption leading-5 text-fg-secondary">
      {children}
    </span>
  );
}
