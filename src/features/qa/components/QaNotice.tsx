import type { ReactNode } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/** text-caption은 cn(twMerge)의 색 클래스와 충돌하므로 cn 밖에 붙입니다. */
export function QaNotice({
  children,
  tone = 'info',
  className,
}: {
  children: ReactNode;
  tone?: 'info' | 'warning';
  className?: string;
}) {
  const Icon = tone === 'warning' ? AlertTriangle : Info;
  return (
    <p
      className={`text-caption ${cn(
        'flex items-start gap-1.5',
        tone === 'warning' ? 'text-warning-text' : 'text-fg-secondary',
        className,
      )}`}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
