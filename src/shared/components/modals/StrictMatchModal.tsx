import { useEffect, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

/** 비가역 promote의 확인 게이트입니다. 라벨의 대소문자·공백까지 그대로 비교합니다. 실제 실행은 사람에게 맡깁니다. */
interface StrictMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: string;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function StrictMatchModal({
  open,
  onOpenChange,
  label,
  title = '라벨을 반영할까요?',
  description,
  confirmLabel = '반영',
  onConfirm,
  loading = false,
}: StrictMatchModalProps) {
  const [value, setValue] = useState('');
  const matched = value === label;

  useEffect(() => {
    if (!open) setValue('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-modal-wide">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <p className="text-body text-fg-secondary">
            라벨명을 정확히 입력해 주세요. <span className="font-mono font-medium text-foreground">{label}</span>
          </p>
          {/* placeholder 없음 (04 §10-2): 라벨을 placeholder 로 노출하면 strict-match 안전성 약화 */}
          <Input value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            닫기
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!matched || loading}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
