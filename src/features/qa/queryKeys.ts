import type { Part, Round } from '@/features/qa/schemas';

export const qaKeys = {
  all: ['qa'] as const,
  sprintLists: () => ['qa', 'sprints', 'list'] as const,
  sprint: (id: number) => ['qa', 'sprints', 'detail', id] as const,
  job: (id: number) => ['qa', 'jobs', id] as const,
  checklists: (id: number) => ['qa', 'checklists', id] as const,
  checklist: (id: number, round: Round) => ['qa', 'checklists', id, round] as const,
  design: (id: number) => ['qa', 'design', id] as const,
  reflections: (id: number) => ['qa', 'reflections', id] as const,
  cellHistories: (id: number) => ['qa', 'cellHistory', id] as const,
  cellHistory: (id: number, part: Part) => ['qa', 'cellHistory', id, part] as const,
  designHistory: (id: number) => ['qa', 'designHistory', id] as const,
  fixReports: (id: number) => ['qa', 'fixReports', id] as const,
};
