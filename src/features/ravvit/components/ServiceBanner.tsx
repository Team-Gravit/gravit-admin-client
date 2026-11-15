import type { ServiceStatus } from '@/features/ravvit/types';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/** 403은 재시도로 해결되지 않아 다시 확인 행동을 제공하지 않습니다. */
const BANNERS: Record<
  Exclude<ServiceStatus, 'ok' | 'checking'>,
  { message: string; tone: 'warning' | 'danger'; recheckable: boolean }
> = {
  unreachable: {
    message: 'Ravvit 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.',
    tone: 'warning',
    recheckable: true,
  },
  forbidden: {
    message: 'Ravvit 사용 권한이 없어요. 관리자에게 문의해 주세요.',
    tone: 'danger',
    recheckable: false,
  },
  'auth-unavailable': {
    message: '인증 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.',
    tone: 'warning',
    recheckable: true,
  },
};

interface ServiceBannerProps {
  status: ServiceStatus;
  onRecheck: () => void;
}

export function ServiceBanner({ status, onRecheck }: ServiceBannerProps) {
  if (status === 'ok' || status === 'checking') return null;
  const { message, tone, recheckable } = BANNERS[status];

  return (
    <div
      className={cn(
        'mb-4 flex items-center gap-2 rounded-lg border border-border p-3 text-body',
        tone === 'danger' ? 'bg-danger-bg text-danger-text' : 'bg-warning-bg text-warning-text',
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {recheckable && (
        <Button variant="ghost" size="sm" onClick={onRecheck}>
          <RefreshCw className="h-4 w-4" />
          다시 확인
        </Button>
      )}
    </div>
  );
}
