import { env } from '@/env';
import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';
import type { DesignItem } from '@/features/qa/schemas';
import type { QaMockState } from '@/mocks/qa/state';

const QA = env.VITE_QA_API_BASE;

export function createSprintHandlers(state: QaMockState) {
  const {
    scenario,
    now,
    error,
    conflict,
    invalidState,
    KEYS,
    versionBody,
    records,
    ids,
    newJob,
    seed,
    sync,
    guard,
    versionMismatch,
    active,
    missing,
    badRequest,
  } = state;
  return [
    http.get(`${QA}/sprints`, async () => {
      await delay(60);
      const failure = guard();
      if (failure) return failure;
      return HttpResponse.json(
        scenario() === 'empty'
          ? []
          : [...records.values()].reverse().map(({ sprint: s }) => ({
              id: s.id,
              sprintKey: s.sprintKey,
              summary: s.summary,
              status: s.status,
            })),
      );
    }),
    http.post(`${QA}/sprints`, async ({ request }) => {
      const failure = guard();
      if (failure) return failure;
      const parsed = z.object({ notionPageUrl: z.string().url() }).safeParse(await request.json());
      if (!parsed.success) return badRequest();
      const notionId = parsed.data.notionPageUrl.replace(/-/g, '').match(/[a-f0-9]{32}/i)?.[0];
      if (!notionId) return badRequest();
      if (notionId.startsWith('0000')) return missing();
      if ([...records.values()].some((r) => r.notionId === notionId))
        return error(409, 'SPRINT_4091', '이미 등록된 스프린트입니다.');
      const id = ids.sprint++;
      const record = seed(id, 'DRAFT');
      record.notionId = notionId;
      return HttpResponse.json(record.sprint, { status: 201 });
    }),
    http.get(`${QA}/sprints/:id`, async ({ params }) => {
      const failure = guard();
      if (failure) return failure;
      const record = records.get(Number(params.id));
      if (!record) return missing();
      sync(record);
      return HttpResponse.json(record.sprint);
    }),
    http.post(`${QA}/sprints/:id/setup-jobs`, async ({ params, request }) => {
      const failure = guard();
      if (failure) return failure;
      const record = records.get(Number(params.id));
      if (!record) return missing();
      const parsed = versionBody.safeParse(await request.json());
      if (!parsed.success) return badRequest();
      if (versionMismatch(record.sprint.version, parsed.data.version)) return conflict();
      if (scenario() === 'recollect-conflict') return invalidState();
      if (scenario() === 'recollect-error')
        return error(500, 'GLOBAL_5001', '준비 작업을 시작하지 못했습니다.');
      const recollect =
        record.sprint.pendingReflectionCount > 0 &&
        record.sprint.setupSteps.some((s) => s.status === 'WAITING');
      const retry = record.sprint.latestJob?.status === 'FAILED';
      if (
        record.sprint.status === 'CLOSED' ||
        (!recollect && (active(record) || (record.sprint.status !== 'DRAFT' && !retry)))
      )
        return invalidState();
      if (recollect) {
        record.reflections = record.reflections.filter(
          (r) => !['PENDING', 'FAILED'].includes(r.state),
        );
        const previous = record.sprint.latestJob;
        if (previous) {
          previous.status = 'CANCELLED';
          previous.finishedAt = now();
        }
      }
      const failedIndex = record.sprint.setupSteps.findIndex((s) => s.status === 'FAILED');
      const step = recollect ? 1 : retry && failedIndex >= 0 ? failedIndex : 0;
      const previousSteps = record.sprint.setupSteps;
      const job = newJob(record.sprint.id, step);
      job.status = 'QUEUED';
      job.attempt = 0;
      job.nextRunAt = now();
      record.sprint.latestJob = job;
      record.sprint.status =
        step <= 1
          ? 'SPEC_LOAD'
          : step === 2
            ? 'CHECKLIST'
            : step === 3
              ? 'DESIGN_REVIEW'
              : 'AUTO_REVIEW';
      record.sprint.version++;
      record.sprint.setupSteps = KEYS.map((key, i) => ({
        key,
        status: i < step ? 'DONE' : i === step ? 'RUNNING' : 'PENDING',
        attempt:
          i === step
            ? (previousSteps.find((s) => s.key === key)?.attempt ?? 0) + 1
            : i < step
              ? 1
              : 0,
        message: null,
      }));
      record.sprint.connections = (['NOTION', 'FIGMA', 'SERVER', 'WEB', 'APP'] as const).map(
        (target) => ({
          target,
          connected: true,
          ref: ['NOTION', 'FIGMA'].includes(target) ? null : 'qa-baseline@def5678',
          message: null,
        }),
      );
      sync(record);
      return HttpResponse.json({ jobId: job.id }, { status: 202 });
    }),
  ];
}

export function createJobHandlers(state: QaMockState) {
  const { now, invalidState, KEYS, records, jobs, sync, guard, missing } = state;
  return [
    http.get(`${QA}/jobs/:id`, async ({ params }) => {
      const failure = guard();
      if (failure) return failure;
      const entry = jobs.get(Number(params.id));
      if (!entry) return missing();
      const record = records.get(entry.job.sprintId ?? -1);
      if (record && !entry.waiting && ['QUEUED', 'RUNNING'].includes(entry.job.status)) {
        if (entry.job.status === 'QUEUED') {
          entry.job.status = 'RUNNING';
          entry.job.attempt++;
          entry.job.nextRunAt = null;
        } else {
          const jobStep = entry.job.steps[entry.step];
          const setupStep = record.sprint.setupSteps[entry.step];
          if (!jobStep || !setupStep) return invalidState();
          jobStep.status = 'DONE';
          jobStep.finishedAt = now();
          setupStep.status = 'DONE';
          if (entry.step === 1)
            setupStep.message = 'API 명세 일부가 없어 해당 항목은 수동 확인이 필요합니다.';
          entry.step++;
          const nextKey = KEYS[entry.step];
          if (!nextKey) {
            entry.job.status = 'SUCCEEDED';
            entry.job.finishedAt = now();
            record.sprint.status = 'MANUAL_REVIEW';
          } else {
            entry.job.type = entry.step <= 1 ? 'SPEC_LOAD' : 'QA_PREPARE';
            const nextJobStep = entry.job.steps[entry.step];
            if (nextJobStep) {
              nextJobStep.status = 'RUNNING';
              nextJobStep.startedAt = now();
            }
            record.sprint.setupSteps[entry.step] = {
              key: nextKey,
              status: 'RUNNING',
              attempt: 1,
              message: null,
            };
            record.sprint.status =
              entry.step <= 1
                ? 'SPEC_LOAD'
                : entry.step === 2
                  ? 'CHECKLIST'
                  : entry.step === 3
                    ? 'DESIGN_REVIEW'
                    : 'AUTO_REVIEW';
          }
          record.sprint.version++;
          sync(record);
        }
      }
      return HttpResponse.json(entry.job);
    }),
    http.post(`${QA}/jobs/:id/cancel`, ({ params }) => {
      const failure = guard();
      if (failure) return failure;
      const entry = jobs.get(Number(params.id));
      if (!entry) return missing();
      if (!['QUEUED', 'RUNNING'].includes(entry.job.status)) return invalidState();
      entry.job.cancelRequested = true;
      entry.job.status = 'CANCELLED';
      entry.job.finishedAt = now();
      const record = records.get(entry.job.sprintId ?? -1);
      if (record) {
        record.sprint.status = 'DRAFT';
        record.sprint.version++;
      }
      return HttpResponse.json(entry.job, { status: 202 });
    }),
  ];
}

export function createCloseSprintHandlers(state: QaMockState) {
  const {
    error,
    conflict,
    invalidState,
    versionBody,
    records,
    sync,
    guard,
    versionMismatch,
    active,
    missing,
    badRequest,
  } = state;
  return [
    http.post(`${QA}/sprints/:id/close`, async ({ params, request }) => {
      const failure = guard();
      if (failure) return failure;
      const record = records.get(Number(params.id));
      if (!record) return missing();
      const parsed = versionBody.safeParse(await request.json());
      if (!parsed.success) return badRequest();
      if (versionMismatch(record.sprint.version, parsed.data.version)) return conflict();
      if (record.sprint.status !== 'MANUAL_REVIEW' || active(record)) return invalidState();
      if (
        record.fixture.design.some((i: DesignItem) => i.state === 'UNCHECKED') ||
        record.fixture.items.some((i) => i.cells.some((c) => c.state === 'UNCHECKED'))
      )
        return error(409, 'SPRINT_4093', '디자인·1차·2차 목록에 미검수가 남아 있습니다.');
      record.sprint.status = 'CLOSED';
      record.sprint.version++;
      sync(record);
      return HttpResponse.json(record.sprint);
    }),
  ];
}
