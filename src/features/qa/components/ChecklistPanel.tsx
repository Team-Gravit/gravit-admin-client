import { useState } from 'react';
import { QaApiError } from '@/shared/api/qaClient';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { QaConfirmModal } from '@/features/qa/components/QaConfirmModal';
import { EmptyState } from '@/shared/components/states/EmptyState';
import { ErrorState } from '@/shared/components/states/ErrorState';
import { LoadingSkeleton } from '@/shared/components/states/LoadingSkeleton';
import { hasRunningSetup, isStageRunning, useChecklist } from '@/features/qa/queries';
import { useDeleteChecklistItem } from '@/features/qa/mutations';
import { ChecklistFeatureSection } from '@/features/qa/components/ChecklistFeatureSection';
import {
  filterChecklistFeatures,
  checklistNavigationEntries,
} from '@/features/qa/checklistSelectors';
import { useNextUnchecked } from '@/features/qa/useNextUnchecked';
import { ChecklistItemFormModal } from '@/features/qa/components/ChecklistItemFormModal';
import { QaStageActivity } from '@/features/qa/components/QaStageActivity';
import { ProgressGauges } from '@/features/qa/components/ProgressGauges';
import { QaNotice } from '@/features/qa/components/QaNotice';
import { NOTICE_COPY } from '@/features/qa/copy';
import { PART_LABELS, PART_ORDER } from '@/features/qa/labels';
import { qaErrorView } from '@/features/qa/errorView';
import {
  partSchema,
  type ChecklistFeature,
  type ChecklistItem,
  type Part,
  type Round,
  type Sprint,
} from '@/features/qa/schemas';

export function ChecklistPanel({ sprint, round }: { sprint: Sprint; round: Round }) {
  const query = useChecklist(sprint.id, round);
  const remove = useDeleteChecklistItem(sprint.id);
  const [filter, setFilter] = useState<Part | 'ALL'>('ALL');
  const [form, setForm] = useState<{ feature: ChecklistFeature; item?: ChecklistItem } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<ChecklistItem | null>(null);
  const closed = sprint.status === 'CLOSED';
  const running = hasRunningSetup(sprint);
  const tabRunning = isStageRunning(
    sprint,
    round === 1 ? ['CHECKLIST_GENERATE', 'AUTO_REVIEW'] : ['CHECKLIST_GENERATE'],
  );
  const activity = (
    <QaStageActivity>
      {round === 1 && isStageRunning(sprint, ['AUTO_REVIEW'])
        ? NOTICE_COPY.AUTO_REVIEW_RUNNING
        : NOTICE_COPY.CHECKLIST_GENERATING}
    </QaStageActivity>
  );
  const locked = closed || running;
  const parts = filter === 'ALL' ? PART_ORDER : [filter];
  const features = filterChecklistFeatures(query.data?.features ?? [], filter);
  const next = useNextUnchecked(checklistNavigationEntries(features, parts, closed));
  if (query.isLoading) return tabRunning ? activity : <LoadingSkeleton />;
  if (query.isError) {
    const view = qaErrorView(query.error);
    return (
      <ErrorState
        message={view.message}
        onRetry={view.retryable ? () => query.refetch() : undefined}
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <ProgressGauges progress={sprint.progress} />
      {closed && <QaNotice>{NOTICE_COPY.CLOSED}</QaNotice>}
      {running && <QaNotice>{NOTICE_COPY.RUNNING}</QaNotice>}
      {tabRunning && activity}
      <div className="sticky top-header z-10 flex items-center justify-between border-b border-border bg-page py-3">
        <Select
          value={filter}
          onValueChange={(value) => {
            const parsed = partSchema.safeParse(value);
            setFilter(parsed.success ? parsed.data : 'ALL');
          }}
        >
          <SelectTrigger className="w-36" aria-label="파트 필터">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체 파트</SelectItem>
            {PART_ORDER.map((part) => (
              <SelectItem key={part} value={part}>
                {PART_LABELS[part]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!next.hasTarget} onClick={next.next}>
          {NOTICE_COPY.NEXT_UNCHECKED}
        </Button>
      </div>
      {features.length === 0 ? (
        tabRunning ? null : (
          <EmptyState
            message={filter === 'ALL' ? NOTICE_COPY.EMPTY_ITEMS : NOTICE_COPY.EMPTY_FILTERED}
          />
        )
      ) : (
        features.map((feature) => (
          <ChecklistFeatureSection
            key={feature.featureId}
            feature={feature}
            sprint={sprint}
            round={round}
            parts={parts}
            locked={locked}
            navigation={next}
            onAdd={() => setForm({ feature })}
            onEdit={(item) => setForm({ feature, item })}
            onDelete={(item) => {
              remove.reset();
              setDeleting(item);
            }}
          />
        ))
      )}
      {form && (
        <ChecklistItemFormModal
          sprintId={sprint.id}
          feature={form.feature}
          item={form.item}
          locked={locked}
          onClose={() => setForm(null)}
        />
      )}
      <QaConfirmModal
        open={deleting !== null}
        title="항목을 삭제할까요?"
        description={
          <>
            {deleting?.title}
            <br />
            {NOTICE_COPY.ITEM_DELETE_IRREVERSIBLE}
          </>
        }
        confirmLabel="삭제"
        variant="destructive"
        pending={remove.isPending}
        disabled={locked}
        error={remove.isError ? remove.error.message : undefined}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          !locked &&
          remove.mutate(
            { itemId: deleting.id, version: deleting.version },
            {
              onSuccess: () => setDeleting(null),
              onError: (error) => {
                if (error instanceof QaApiError && error.code === 'GLOBAL_4091') setDeleting(null);
              },
            },
          )
        }
      />
    </div>
  );
}
