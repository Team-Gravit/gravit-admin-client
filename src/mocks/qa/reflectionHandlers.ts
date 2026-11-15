import { env } from '@/env';
import { delay, http, HttpResponse } from 'msw';
import type { QaMockState } from '@/mocks/qa/state';

const QA = env.VITE_QA_API_BASE;

export function createReflectionHandlers(state: QaMockState) {
  const {
    scenario,
    now,
    error,
    conflict,
    invalidState,
    versionBody,
    records,
    failedApproval,
    newJob,
    sync,
    guard,
    versionMismatch,
    findReflection,
    missing,
    badRequest,
  } = state;
  return [
    http.get(`${QA}/sprints/:id/reflections`, ({ params }) => {
      const failure = guard();
      if (failure) return failure;
      const record = records.get(Number(params.id));
      return record ? HttpResponse.json(record.reflections) : missing();
    }),
    ...(['approve', 'reject'] as const).map((action) =>
      http.post(`${QA}/reflections/:id/${action}`, async ({ params, request }) => {
        const failure = guard();
        if (failure) return failure;
        const found = findReflection(Number(params.id));
        if (!found) return missing();
        const { record, item } = found;
        const parsed = versionBody.safeParse(await request.json());
        if (!parsed.success) return badRequest();
        if (versionMismatch(item.version, parsed.data.version)) return conflict();
        if (!['PENDING', 'FAILED'].includes(item.state)) return invalidState();
        if (scenario() === 'reflection-changed' && action === 'approve')
          return error(409, 'REFLECTION_4091', '제안 이후 명세가 바뀌었습니다.');
        item.version++;
        if (
          action === 'approve' &&
          scenario() === 'reflection-fail' &&
          !failedApproval.has(item.id)
        ) {
          failedApproval.add(item.id);
          item.state = 'FAILED';
          item.message = 'Notion 본문 반영에 실패했습니다. 남은 작업부터 다시 시도할 수 있습니다.';
          sync(record);
          return error(502, 'REFLECTION_5021', item.message);
        }
        if (scenario() === 'reflection-delay') await delay(800);
        item.state = action === 'approve' ? 'APPLIED' : 'REJECTED';
        item.message = null;
        record.sprint.version++;
        sync(record);
        if (record.sprint.pendingReflectionCount === 0) {
          // SetupFacade.proceedAfterReflections enters QA_PREPARE in this request.
          const collected = record.sprint.setupSteps[1];
          if (collected) {
            collected.status = 'DONE';
            collected.message = '반영 제안 처리가 끝났습니다.';
          }
          const next = record.sprint.setupSteps[2];
          if (next) {
            next.status = 'RUNNING';
            next.attempt = 1;
          }
          const job = newJob(record.sprint.id, 2);
          job.status = 'QUEUED';
          job.attempt = 0;
          job.nextRunAt = now();
          record.sprint.latestJob = job;
          record.sprint.status = 'CHECKLIST';
        }
        return HttpResponse.json(item);
      }),
    ),
  ];
}
