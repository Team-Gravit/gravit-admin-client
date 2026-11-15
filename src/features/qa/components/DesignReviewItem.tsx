import { DesignVerdictMenu } from '@/features/qa/components/DesignVerdictMenu';
import { useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { TableCell, TableRow } from '@/shared/components/ui/table';
import { QaApiError } from '@/shared/api/qaClient';
import { useDeleteDesignItem, useUpdateDesignItem } from '@/features/qa/mutations';
import { DesignHistoryModal } from '@/features/qa/components/DesignHistoryModal';
import { FailReasonModal } from '@/features/qa/components/FailReasonModal';
import { DesignItemFormModal } from '@/features/qa/components/DesignItemFormModal';
import { QaConfirmModal } from '@/features/qa/components/QaConfirmModal';
import { NOTICE_COPY } from '@/features/qa/copy';
import type { DesignItem } from '@/features/qa/schemas';

export function DesignReviewItem({
  sprintId,
  item,
  closed,
  running,
  registerRef,
  onFocus,
}: {
  sprintId: number;
  item: DesignItem;
  closed: boolean;
  running: boolean;
  registerRef: (element: HTMLButtonElement | null) => void;
  onFocus: () => void;
}) {
  const update = useUpdateDesignItem(sprintId);
  const remove = useDeleteDesignItem(sprintId);
  const [history, setHistory] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menu, setMenu] = useState(false);
  const [failReason, setFailReason] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const locked = closed || !item.editable;
  const managementLocked = locked || running;
  return (
    <>
      <TableRow aria-label={`${item.platform} ${item.title}`} className="hover:bg-transparent">
        <TableCell className="break-words">
          <h3 className="mb-1 text-body font-semibold text-foreground">{item.title}</h3>
          <p className="whitespace-pre-wrap text-body text-fg-secondary">{item.expected}</p>
        </TableCell>
        {(['WEB', 'APP'] as const).map((platform) => (
          <TableCell key={platform} className="text-center">
            {item.platform !== platform ? (
              <span className="text-fg-muted">—</span>
            ) : (
              <DesignVerdictMenu
                item={item}
                locked={locked}
                pending={update.isPending}
                menu={menu}
                overlayOpen={history || editing || deleting || failReason}
                triggerRef={triggerRef}
                registerRef={registerRef}
                onFocus={onFocus}
                onOpenChange={(open) => setMenu(open && !update.isPending)}
                onChooseState={(state) => {
                  setMenu(false);
                  if (update.isPending) return;
                  if (state === 'FAIL' && item.state !== 'FAIL') {
                    update.reset();
                    setFailReason(true);
                    return;
                  }
                  if (!update.isPending && item.state !== state)
                    update.mutate({ itemId: item.id, state, version: item.version });
                }}
                onEditReason={() => {
                  if (update.isPending) return;
                  setMenu(false);
                  update.reset();
                  setFailReason(true);
                }}
                onHistory={() => setHistory(true)}
              />
            )}
          </TableCell>
        ))}
        <TableCell>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={managementLocked}
              aria-label="수정"
              title="항목 수정"
              className="px-2"
              onClick={() => setEditing(true)}
            >
              <Pencil aria-hidden />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="px-2 text-danger-text"
              aria-label="삭제"
              title="항목 삭제"
              disabled={managementLocked}
              onClick={() => {
                remove.reset();
                setDeleting(true);
              }}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {failReason && (
        <FailReasonModal
          initialReason={item.state === 'FAIL' ? (item.reason ?? '') : ''}
          editingReason={item.state === 'FAIL'}
          pending={update.isPending}
          locked={locked}
          error={update.isError ? update.error.message : undefined}
          onClose={() => setFailReason(false)}
          restoreFocus={() => triggerRef.current?.focus()}
          onConfirm={(reason) => {
            if (!locked && !update.isPending)
              update.mutate(
                { itemId: item.id, state: 'FAIL', reason, version: item.version },
                {
                  onSuccess: () => setFailReason(false),
                  onError: (error) => {
                    if (error instanceof QaApiError && error.code === 'GLOBAL_4091')
                      setFailReason(false);
                  },
                },
              );
          }}
        />
      )}
      {history && <DesignHistoryModal item={item} onClose={() => setHistory(false)} />}
      {editing && (
        <DesignItemFormModal
          sprintId={sprintId}
          item={item}
          locked={managementLocked}
          onClose={() => setEditing(false)}
        />
      )}
      <QaConfirmModal
        open={deleting}
        title="디자인 항목을 삭제할까요?"
        description={
          <>
            {item.title}
            <br />
            {NOTICE_COPY.ITEM_DELETE_IRREVERSIBLE}
          </>
        }
        confirmLabel="삭제"
        variant="destructive"
        pending={remove.isPending}
        disabled={managementLocked}
        error={remove.isError ? remove.error.message : undefined}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          if (!managementLocked)
            remove.mutate(
              { itemId: item.id, version: item.version },
              {
                onSuccess: () => setDeleting(false),
                onError: (error) => {
                  if (error instanceof QaApiError && error.code === 'GLOBAL_4091')
                    setDeleting(false);
                },
              },
            );
        }}
      />
    </>
  );
}
