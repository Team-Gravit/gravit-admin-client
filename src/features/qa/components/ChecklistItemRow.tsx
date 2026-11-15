import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { TableCell, TableRow } from '@/shared/components/ui/table';
import { CheckCellButton } from '@/features/qa/components/CheckCellButton';
import { PartChips } from '@/features/qa/components/PartChips';
import type { useNextUnchecked } from '@/features/qa/useNextUnchecked';
import type { ChecklistItem, Part, Round, Sprint } from '@/features/qa/schemas';

export function ChecklistItemRow({
  sprint,
  round,
  item,
  parts,
  locked,
  navigation,
  onEdit,
  onDelete,
}: {
  sprint: Sprint;
  round: Round;
  item: ChecklistItem;
  parts: readonly Part[];
  locked: boolean;
  navigation: Pick<ReturnType<typeof useNextUnchecked>, 'register' | 'onFocus'>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <TableRow className="hover:bg-transparent" aria-label={item.title}>
      <TableCell className="break-words">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-body font-semibold text-foreground">{item.title}</h3>
            <PartChips parts={item.parts} />
          </div>
          <p className="whitespace-pre-wrap text-body text-fg-secondary">{item.expected}</p>
        </div>
      </TableCell>
      {parts.map((part) => {
        const cell = item.cells.find((c) => c.part === part);
        const key = `${item.id}:${part}`;
        return (
          <TableCell key={part} className="text-center">
            {cell ? (
              <CheckCellButton
                sprintId={sprint.id}
                round={round}
                item={item}
                cell={cell}
                closed={sprint.status === 'CLOSED'}
                sprintStatus={sprint.status}
                registerRef={(el) => navigation.register(key, el)}
                onFocusCell={() => navigation.onFocus(key)}
              />
            ) : (
              <span className="text-fg-muted">-</span>
            )}
          </TableCell>
        );
      })}
      <TableCell>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={locked}
            aria-label="수정"
            title="항목 수정"
            className="px-2"
            onClick={onEdit}
          >
            <Pencil aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="px-2 text-danger-text"
            aria-label="삭제"
            title="항목 삭제"
            disabled={locked}
            onClick={onDelete}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
