import { Button } from '@/shared/components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { FeatureGroupHeader } from '@/features/qa/components/FeatureGroupHeader';
import { ChecklistItemRow } from '@/features/qa/components/ChecklistItemRow';
import { PART_LABELS } from '@/features/qa/labels';
import type { useNextUnchecked } from '@/features/qa/useNextUnchecked';
import type { ChecklistFeature, ChecklistItem, Part, Round, Sprint } from '@/features/qa/schemas';

export function ChecklistFeatureSection({
  feature,
  sprint,
  round,
  parts,
  locked,
  navigation,
  onAdd,
  onEdit,
  onDelete,
}: {
  feature: ChecklistFeature;
  sprint: Sprint;
  round: Round;
  parts: readonly Part[];
  locked: boolean;
  navigation: ReturnType<typeof useNextUnchecked>;
  onAdd: () => void;
  onEdit: (item: ChecklistItem) => void;
  onDelete: (item: ChecklistItem) => void;
}) {
  return (
    <section
      aria-label={`${feature.screenId} ${feature.screenName}`}
      className="overflow-hidden rounded-lg border border-border bg-surface"
    >
      <FeatureGroupHeader
        feature={feature}
        collapsed={navigation.collapsed.has(feature.featureId)}
        onToggle={() => navigation.toggle(feature.featureId)}
      >
        {round === 2 && (
          <Button size="sm" variant="outline" disabled={locked} onClick={onAdd}>
            항목 추가
          </Button>
        )}
      </FeatureGroupHeader>
      {!navigation.collapsed.has(feature.featureId) && (
        <Table className="table-fixed">
          <colgroup>
            <col />
            {parts.map((part) => (
              <col key={part} className="w-28" />
            ))}
            <col className="w-32" />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>항목</TableHead>
              {parts.map((part) => (
                <TableHead key={part} className="text-center">
                  {PART_LABELS[part]}
                </TableHead>
              ))}
              <TableHead>
                <span className="sr-only">항목 관리</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feature.items.map((item) => (
              <ChecklistItemRow
                key={item.id}
                sprint={sprint}
                round={round}
                item={item}
                parts={parts}
                locked={locked}
                navigation={navigation}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item)}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
