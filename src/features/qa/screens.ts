import { ROUTES } from '@/shared/constants/routes';
import type { Sprint } from '@/features/qa/schemas';

export type SprintScreen = 'setup' | 'design' | 'first' | 'second' | 'fixes';
const SCREEN_PATHS = {
  setup: ROUTES.QA_SPRINT_SETUP,
  design: ROUTES.QA_SPRINT_DESIGN,
  first: ROUTES.QA_SPRINT_CHECKLIST_FIRST,
  second: ROUTES.QA_SPRINT_CHECKLIST_SECOND,
  fixes: ROUTES.QA_SPRINT_FIX_REPORTS,
} satisfies Record<SprintScreen, (id: number) => string>;

export const SPRINT_SCREENS = [
  { key: 'setup', label: '연결 현황', to: SCREEN_PATHS.setup },
  { key: 'design', label: '디자인 검수', to: SCREEN_PATHS.design },
  { key: 'first', label: '1차 체크리스트', to: SCREEN_PATHS.first },
  { key: 'second', label: '2차 체크리스트', to: SCREEN_PATHS.second },
  { key: 'fixes', label: '파트별 수정사항', to: SCREEN_PATHS.fixes },
] as const;
export function screenForSprint(sprint: Sprint): SprintScreen {
  if (sprint.pendingReflectionCount > 0 || sprint.latestJob?.status === 'FAILED') return 'setup';
  if (sprint.status === 'DESIGN_REVIEW') return 'design';
  if (sprint.status === 'AUTO_REVIEW') return 'first';
  if (sprint.status === 'MANUAL_REVIEW' || sprint.status === 'CLOSED') return 'second';
  return 'setup';
}
export function screenPath(screen: SprintScreen, id: number) {
  return SCREEN_PATHS[screen](id);
}
