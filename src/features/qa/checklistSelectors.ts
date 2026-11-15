import type { ChecklistFeature, Part } from '@/features/qa/schemas';

export function filterChecklistFeatures(features: ChecklistFeature[], filter: Part | 'ALL') {
  return features
    .map((feature) => ({
      ...feature,
      items: feature.items.filter((item) => filter === 'ALL' || item.parts.includes(filter)),
    }))
    .filter((feature) => filter === 'ALL' || feature.items.length > 0);
}

export function checklistNavigationEntries(
  features: ChecklistFeature[],
  parts: readonly Part[],
  closed: boolean,
) {
  return features.flatMap((feature) =>
    feature.items.flatMap((item) =>
      parts.map((part) => ({
        key: `${item.id}:${part}`,
        featureId: feature.featureId,
        unchecked:
          !closed &&
          item.cells.some(
            (cell) => cell.part === part && cell.state === 'UNCHECKED' && cell.editable,
          ),
      })),
    ),
  );
}
