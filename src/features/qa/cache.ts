import type { QueryClient } from '@tanstack/react-query';
import { qaKeys } from '@/features/qa/queryKeys';
import type { CheckCell, Checklist, DesignItem, DesignReview, Part } from '@/features/qa/schemas';

/** All aggregate rates come back from the server; never recompute progress in the UI. */
export function refreshSprint(client: QueryClient, id: number) {
  return Promise.all([
    client.invalidateQueries({ queryKey: qaKeys.sprint(id) }),
    client.invalidateQueries({ queryKey: qaKeys.sprintLists() }),
    client.invalidateQueries({ queryKey: qaKeys.checklists(id) }),
    client.invalidateQueries({ queryKey: qaKeys.design(id) }),
    client.invalidateQueries({ queryKey: qaKeys.reflections(id) }),
    client.invalidateQueries({ queryKey: qaKeys.fixReports(id) }),
  ]);
}
export function replaceCheckCell(
  checklist: Checklist | undefined,
  itemId: number,
  part: Part,
  cell: CheckCell,
): Checklist | undefined {
  return (
    checklist && {
      ...checklist,
      features: checklist.features.map((feature) => ({
        ...feature,
        items: feature.items.map((item) =>
          item.id !== itemId
            ? item
            : {
                ...item,
                cells: item.cells.map((previous) => (previous.part === part ? cell : previous)),
              },
        ),
      })),
    }
  );
}

export function replaceDesignItem(
  review: DesignReview | undefined,
  updated: DesignItem,
): DesignReview | undefined {
  return (
    review && {
      ...review,
      features: review.features.map((feature) => ({
        ...feature,
        items: feature.items.map((item) => (item.id === updated.id ? updated : item)),
      })),
    }
  );
}
