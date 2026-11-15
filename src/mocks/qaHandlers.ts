import { createQaMockState } from '@/mocks/qa/state';
import { qaScenario } from '@/mocks/qa/scenario';
import { createFixReportHandlers } from '@/mocks/qa/fixReportHandlers';
import {
  createSprintHandlers,
  createJobHandlers,
  createCloseSprintHandlers,
} from '@/mocks/qa/setupHandlers';
import { createReflectionHandlers } from '@/mocks/qa/reflectionHandlers';
import {
  createChecklistReadHandlers,
  createChecklistWriteHandlers,
} from '@/mocks/qa/checklistHandlers';
import { createDesignHandlers } from '@/mocks/qa/designHandlers';

export function createQaHandlers(scenario: () => string | null = qaScenario) {
  const state = createQaMockState(scenario);
  return [
    ...createFixReportHandlers(state),
    ...createSprintHandlers(state),
    ...createJobHandlers(state),
    ...createReflectionHandlers(state),
    ...createChecklistReadHandlers(state),
    ...createDesignHandlers(state),
    ...createChecklistWriteHandlers(state),
    ...createCloseSprintHandlers(state),
  ];
}

export const qaHandlers = createQaHandlers();
