import { expect, it } from 'vitest';
import { screenForSprint, screenPath, SPRINT_SCREENS } from '@/features/qa/screens';
import { createQaMockState } from '@/mocks/qa/state';
import type { Sprint, SprintStatus } from '@/features/qa/schemas';

it('모든 화면 key를 기존 순서·경로로 매핑해요', () => {
  expect(SPRINT_SCREENS.map(({ key }) => screenPath(key, 2))).toEqual([
    '/qa/sprints/2/setup',
    '/qa/sprints/2/design-review',
    '/qa/sprints/2/checklist/1',
    '/qa/sprints/2/checklist/2',
    '/qa/sprints/2/fix-reports',
  ]);
});
it.each<{ status: SprintStatus; expected: string }>([
  { status: 'DRAFT', expected: 'setup' },
  { status: 'SPEC_LOAD', expected: 'setup' },
  { status: 'CHECKLIST', expected: 'setup' },
  { status: 'DESIGN_REVIEW', expected: 'design' },
  { status: 'AUTO_REVIEW', expected: 'first' },
  { status: 'MANUAL_REVIEW', expected: 'second' },
  { status: 'CLOSED', expected: 'second' },
])('$status의 기본 화면은 $expected예요', ({ status, expected }) => {
  const sprint = createQaMockState(() => null).records.get(2)?.sprint;
  if (!sprint) throw new Error('fixture missing');
  expect(screenForSprint({ ...sprint, status })).toBe(expected);
});
it('반영 대기와 실패한 준비 작업은 setup이 우선이에요', () => {
  const state = createQaMockState(() => null);
  const sprint = state.records.get(2)?.sprint;
  const failedJob = state.records.get(8)?.sprint.latestJob;
  if (!sprint || !failedJob) throw new Error('fixture missing');
  const pending: Sprint = { ...sprint, pendingReflectionCount: 1 };
  expect(screenForSprint(pending)).toBe('setup');
  expect(screenForSprint({ ...sprint, latestJob: failedJob })).toBe('setup');
});
