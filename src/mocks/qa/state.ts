import { HttpResponse } from 'msw';
import { z } from 'zod';
import { buildFixture, progressOf, SCREENS } from '@/mocks/qaChecklist';
import type { QaFixture } from '@/mocks/qaChecklist';
import { verdictUpdateSchema } from '@/features/qa/schemas';
import type {
  DesignItem,
  Job,
  FixReports,
  Reflection,
  Sprint,
  SprintStatus,
} from '@/features/qa/schemas';
import { qaScenario } from '@/mocks/qa/scenario';

export function createQaMockState(scenario: () => string | null = qaScenario) {
  const now = () => `${new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, -1)}+09:00`;
  const error = (status: number, code: string, message: string) =>
    HttpResponse.json({ error: code, message }, { status });
  const conflict = () =>
    error(409, 'GLOBAL_4091', '다른 운영자가 먼저 변경했습니다. 다시 불러와 주세요.');
  const invalidState = () =>
    error(409, 'SPRINT_4092', '현재 상태에서는 요청을 처리할 수 없습니다.');
  const KEYS = [
    'CONNECT',
    'SPEC_COLLECT',
    'CHECKLIST_GENERATE',
    'DESIGN_REVIEW',
    'AUTO_REVIEW',
  ] as const;
  const versionBody = z.object({ version: z.number().int() });
  const stateBody = verdictUpdateSchema;
  function unchangedFail(
    current: Pick<DesignItem, 'state' | 'reason'>,
    update: z.infer<typeof stateBody>,
  ) {
    return (
      current.state === 'FAIL' &&
      update.state === 'FAIL' &&
      (scenario() === 'legacy' || !update.reason || update.reason === current.reason)
    );
  }
  interface RecordData {
    sprint: Sprint;
    fixture: QaFixture;
    reflections: Reflection[];
    notionId: string;
  }
  const records = new Map<number, RecordData>();
  const jobs = new Map<number, { job: Job; step: number; waiting: boolean }>();
  const ids = { sprint: 11, job: 100, item: 900000 };
  const failedApproval = new Set<number>();

  function newJob(sprintId: number, step: number, waiting = false): Job {
    const job: Job = {
      id: ids.job++,
      type: step <= 1 ? 'SPEC_LOAD' : 'QA_PREPARE',
      sprintId,
      status: 'RUNNING',
      attempt: 1,
      maxAttempts: 4,
      nextRunAt: null,
      cancelRequested: false,
      lastError: null,
      createdAt: now(),
      finishedAt: null,
      steps: KEYS.map((name, i) => ({
        seq: i + 1,
        name,
        status: i < step ? 'DONE' : i === step ? 'RUNNING' : 'PENDING',
        message: null,
        startedAt: i <= step ? now() : null,
        finishedAt: i < step ? now() : null,
      })),
    };
    jobs.set(job.id, { job, step, waiting });
    return job;
  }
  function seed(id: number, status: SprintStatus, complete = false) {
    const fixture = buildFixture(id, complete);
    if (id === 2 && scenario() === 'auto-fail') {
      const item = fixture.design[0];
      if (item) {
        item.state = 'FAIL';
        item.reason = 'Figma의 버튼 배치와 명세가 다릅니다.';
        const history = fixture.designHistory.get(item.id)?.[0];
        if (history) Object.assign(history, { state: item.state, reason: item.reason });
      }
    }
    const ready = !['DRAFT', 'SPEC_LOAD', 'CHECKLIST'].includes(status);
    const sprint: Sprint = {
      id,
      sprintKey: `${id}th Agile`,
      summary:
        id === 7
          ? null
          : ({
              2: '로그인·공통 화면 수동 검수',
              6: '기능 명세 변경 반영 승인',
              8: '저장소 연결 실패',
              9: '모든 검수 완료',
            }[id] ?? 'QA 흐름 예시'),
      status,
      version: 0,
      connections:
        status === 'DRAFT'
          ? []
          : (['NOTION', 'FIGMA', 'SERVER', 'WEB', 'APP'] as const).map((target) => ({
              target,
              connected: id !== 8 || target !== 'APP',
              ref: ['NOTION', 'FIGMA'].includes(target) ? null : 'qa-baseline@abc1234',
              message:
                id === 8 && target === 'APP' ? 'qa-baseline 브랜치를 찾을 수 없습니다.' : null,
            })),
      progress: ready ? progressOf(fixture) : [],
      setupSteps:
        status === 'DRAFT'
          ? []
          : KEYS.map((key) => ({
              key,
              status: 'DONE',
              attempt: 1,
              message:
                key === 'SPEC_COLLECT'
                  ? 'API 명세 일부가 없어 해당 항목은 수동 확인이 필요합니다.'
                  : null,
            })),
      latestJob: null,
      pendingReflectionCount: 0,
    };
    const record: RecordData = {
      sprint,
      fixture,
      reflections: [],
      notionId: String(id).padStart(32, 'a'),
    };
    if (id === 6) {
      record.reflections = SCREENS.map((screen, n) => ({
        id: 600 + n,
        featureId: screen.featureId,
        screenId: screen.screenId,
        screenName: screen.screenName,
        historyRows: [{ sprint: '6th Agile', change: '오류 안내와 재시도 동작을 보완했습니다.' }],
        before: '### 오류 처리\n오류 안내를 표시합니다.',
        after: '### 오류 처리\n오류 안내를 표시하고 **다시 시도** 버튼을 제공합니다.',
        state: n === 0 ? 'PENDING' : 'FAILED',
        message: n === 1 ? 'Notion 본문 반영 중 연결이 끊겼습니다.' : null,
        version: 0,
      }));
      sprint.pendingReflectionCount = 2;
      sprint.setupSteps = KEYS.map((key, i) => ({
        key,
        status: i === 0 ? 'DONE' : i === 1 ? 'WAITING' : 'PENDING',
        attempt: i <= 1 ? 1 : 0,
        message: i === 1 ? '명세 수정 이력의 본문 반영 승인을 기다리고 있습니다.' : null,
      }));
      sprint.latestJob = newJob(id, 1, true);
      // SPEC_LOAD has finished while the server waits for human decisions.
      sprint.latestJob.status = 'SUCCEEDED';
      sprint.latestJob.finishedAt = now();
    } else if (id === 8) {
      const job = newJob(id, 0);
      job.status = 'FAILED';
      job.lastError = 'NonRetryableJobException: APP 저장소 qa-baseline 브랜치가 없습니다.';
      if (job.steps[0]) job.steps[0].status = 'FAILED';
      sprint.latestJob = job;
      sprint.setupSteps = KEYS.map((key, i) => ({
        key,
        status: i === 0 ? 'FAILED' : 'PENDING',
        attempt: i === 0 ? 1 : 0,
        message: i === 0 ? 'APP 저장소 qa-baseline 브랜치가 없습니다.' : null,
      }));
    } else if ([3, 4, 5].includes(id)) {
      const step = id === 3 ? 4 : id === 4 ? 3 : 2;
      sprint.latestJob = newJob(id, step);
      sprint.setupSteps = KEYS.map((key, i) => ({
        key,
        status: i < step ? 'DONE' : i === step ? 'RUNNING' : 'PENDING',
        attempt: i <= step ? 1 : 0,
        message: null,
      }));
    }
    records.set(id, record);
    return record;
  }
  seed(1, 'CLOSED', true);
  seed(2, 'MANUAL_REVIEW');
  seed(3, 'AUTO_REVIEW');
  seed(4, 'DESIGN_REVIEW');
  seed(5, 'CHECKLIST');
  seed(6, 'SPEC_LOAD');
  seed(7, 'DRAFT');
  seed(8, 'SPEC_LOAD');
  seed(9, 'MANUAL_REVIEW', true);

  function sync(record: RecordData) {
    record.sprint.pendingReflectionCount = record.reflections.filter((r) =>
      ['PENDING', 'FAILED'].includes(r.state),
    ).length;
    record.sprint.progress = ['DRAFT', 'SPEC_LOAD', 'CHECKLIST'].includes(record.sprint.status)
      ? []
      : progressOf(record.fixture);
  }
  function guard() {
    if (scenario() === '503') return error(503, 'AUTH_5031', '인증 서버에 연결할 수 없습니다.');
    if (scenario() === '403') return error(403, 'AUTH_4031', 'QA 메뉴를 사용할 권한이 없습니다.');
    return null;
  }
  function versionMismatch(current: number, requested: number) {
    return scenario() === 'stale' || current !== requested;
  }
  function findItem(id: number) {
    for (const record of records.values()) {
      const item = record.fixture.items.find((i) => i.id === id);
      if (item) return { record, item };
    }
  }
  function findDesign(id: number) {
    for (const record of records.values()) {
      const item = record.fixture.design.find((i) => i.id === id);
      if (item) return { record, item };
    }
  }
  function findReflection(id: number) {
    for (const record of records.values()) {
      const item = record.reflections.find((i) => i.id === id);
      if (item) return { record, item };
    }
  }
  function active(record: RecordData) {
    return ['QUEUED', 'RUNNING'].includes(record.sprint.latestJob?.status ?? '');
  }
  const missing = () => error(404, 'GLOBAL_4041', '대상을 찾을 수 없습니다.');
  const badRequest = () => error(400, 'GLOBAL_4001', '요청 형식이 올바르지 않습니다.');

  function fixReportsOf(record: RecordData): FixReports {
    const countUnchecked = (classification: 'AUTO' | 'MANUAL') =>
      record.fixture.items
        .filter((item) => item.classification === classification)
        .flatMap((item) => item.cells)
        .filter((cell) => cell.state === 'UNCHECKED').length;
    const unchecked = {
      design: record.fixture.design.filter((item) => item.state === 'UNCHECKED').length,
      first: countUnchecked('AUTO'),
      second: countUnchecked('MANUAL'),
    };
    return {
      sprintId: record.sprint.id,
      status: record.sprint.status,
      ready:
        ['MANUAL_REVIEW', 'CLOSED'].includes(record.sprint.status) &&
        !active(record) &&
        Object.values(unchecked).every((count) => count === 0),
      unchecked,
      parts: (['DESIGN', 'WEB', 'APP', 'SERVER'] as const).map((part) => ({
        part,
        failCount:
          part === 'DESIGN'
            ? record.fixture.design.filter((item) => item.state === 'FAIL').length
            : record.fixture.items
                .flatMap((item) => item.cells)
                .filter((cell) => cell.part === part && cell.state === 'FAIL').length,
        fileName: `${record.sprint.sprintKey}-${part}-수정사항.txt`,
      })),
    };
  }

  return {
    scenario,
    now,
    error,
    conflict,
    invalidState,
    KEYS,
    versionBody,
    stateBody,
    unchangedFail,
    records,
    jobs,
    ids,
    failedApproval,
    newJob,
    seed,
    sync,
    guard,
    versionMismatch,
    findItem,
    findDesign,
    findReflection,
    active,
    missing,
    badRequest,
    fixReportsOf,
  };
}
export type QaMockState = ReturnType<typeof createQaMockState>;
