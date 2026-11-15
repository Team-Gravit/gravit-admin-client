import type { MutableRefObject } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { QaTooltipContent } from '@/features/qa/components/QaTooltipContent';
import { QaStatusIcon } from '@/features/qa/components/QaStatusIcon';
import { CELL_CATEGORIES } from '@/features/qa/status';
import { CELL_STATE_LABELS, PART_LABELS } from '@/features/qa/labels';
import { NOTICE_COPY } from '@/features/qa/copy';
import type { CellState, DesignItem } from '@/features/qa/schemas';

export function DesignVerdictMenu({
  item,
  locked,
  pending,
  menu,
  overlayOpen,
  triggerRef,
  registerRef,
  onFocus,
  onOpenChange,
  onChooseState,
  onEditReason,
  onHistory,
}: {
  item: DesignItem;
  locked: boolean;
  pending: boolean;
  menu: boolean;
  overlayOpen: boolean;
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
  registerRef: (element: HTMLButtonElement | null) => void;
  onFocus: () => void;
  onOpenChange: (open: boolean) => void;
  onChooseState: (state: CellState) => void;
  onEditReason: () => void;
  onHistory: () => void;
}) {
  const suppressTooltip =
    item.state === 'PASS' || item.state === 'FAIL' || menu || overlayOpen || pending;
  return (
    <DropdownMenu modal={false} open={menu} onOpenChange={onOpenChange}>
      <Tooltip open={suppressTooltip ? false : undefined}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              ref={(element) => {
                triggerRef.current = element;
                registerRef(element);
              }}
              type="button"
              onFocus={onFocus}
              aria-disabled={pending}
              aria-busy={pending}
              aria-label={`${PART_LABELS[item.platform]} ${CELL_STATE_LABELS[item.state]} — ${locked ? '변경 이력' : '변경'}`}
              className="relative inline-flex h-10 w-16 items-center justify-center rounded-md hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <QaStatusIcon
                category={CELL_CATEGORIES[item.state]}
                label={CELL_STATE_LABELS[item.state]}
                tooltip={false}
                pending={pending}
              />
              {!locked && (
                <ChevronDown className="absolute right-0 size-3.5 text-fg-muted" aria-hidden />
              )}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <QaTooltipContent side="bottom">{CELL_STATE_LABELS[item.state]}</QaTooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="center"
        onPointerDownOutside={(event) => {
          if (event.target instanceof Node && triggerRef.current?.contains(event.target))
            event.preventDefault();
        }}
      >
        {!locked && (
          <>
            {(['UNCHECKED', 'PASS', 'FAIL', 'NOT_APPLICABLE'] as const).map((state) => (
              <DropdownMenuCheckboxItem
                key={state}
                checked={item.state === state}
                onCheckedChange={() => onChooseState(state)}
              >
                {CELL_STATE_LABELS[state]}
              </DropdownMenuCheckboxItem>
            ))}
            {item.state === 'FAIL' && (
              <DropdownMenuItem onSelect={onEditReason}>
                {NOTICE_COPY.FAIL_REASON_EDIT}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={onHistory}>변경 이력</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
