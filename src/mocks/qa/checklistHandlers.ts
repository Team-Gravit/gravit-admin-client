import { env } from '@/env';
import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';
import { checklistResponse, SCREENS } from '@/mocks/qaChecklist';
import { checklistItemFormSchema, partSchema } from '@/features/qa/schemas';
import type { ChecklistItem } from '@/features/qa/schemas';
import { compatibilityBody } from '@/mocks/qa/scenario';
import type { QaMockState } from '@/mocks/qa/state';

const QA = env.VITE_QA_API_BASE;

export function createChecklistReadHandlers(state: QaMockState) {
  const { scenario, records, guard, missing, badRequest } = state;
  return [
    http.get(`${QA}/sprints/:id/checklist`, ({ params, request }) => {
      const failure = guard();
      if (failure) return failure;
      const round = new URL(request.url).searchParams.get('round');
      if (round !== '1' && round !== '2') return badRequest();
      const record = records.get(Number(params.id));
      return record
        ? HttpResponse.json(
            ['DRAFT', 'SPEC_LOAD', 'CHECKLIST'].includes(record.sprint.status) &&
              scenario() !== 'pre-review-cells'
              ? { sprintId: record.sprint.id, sprintStatus: record.sprint.status, features: [] }
              : compatibilityBody(
                  checklistResponse(
                    record.sprint.id,
                    record.sprint.status,
                    record.fixture,
                    round === '1' ? 1 : 2,
                  ),
                  scenario(),
                ),
          )
        : missing();
    }),
  ];
}

export function createChecklistWriteHandlers(state: QaMockState) {
  const {
    scenario,
    now,
    error,
    conflict,
    invalidState,
    stateBody,
    unchangedFail,
    records,
    ids,
    sync,
    guard,
    versionMismatch,
    findItem,
    active,
    missing,
    badRequest,
  } = state;
  return [
    http.post(`${QA}/sprints/:id/checklist-items`, async ({ params, request }) => {
      const failure = guard();
      if (failure) return failure;
      const record = records.get(Number(params.id));
      if (!record) return missing();
      if (active(record) || record.sprint.status === 'CLOSED') return invalidState();
      const parsed = checklistItemFormSchema
        .extend({ featureId: z.number(), classification: z.enum(['AUTO', 'MANUAL']).optional() })
        .safeParse(await request.json());
      if (!parsed.success) return badRequest();
      if (!SCREENS.some((s) => s.featureId === parsed.data.featureId)) return badRequest();
      const item: ChecklistItem = {
        ...parsed.data,
        classification: 'MANUAL',
        id: ids.item++,
        origin: 'HUMAN',
        version: 0,
        cells: parsed.data.parts.map((part) => ({
          part,
          state: 'UNCHECKED',
          source: 'MANUAL',
          reason: null,
          evidence: [],
          editable: true,
          version: 0,
        })),
      };
      record.fixture.items.push(item);
      sync(record);
      return HttpResponse.json(item, { status: 201 });
    }),
    http.patch(`${QA}/checklist-items/:id`, async ({ params, request }) => {
      const failure = guard();
      if (failure) return failure;
      const found = findItem(Number(params.id));
      if (!found) return missing();
      const { record, item } = found;
      if (active(record) || record.sprint.status === 'CLOSED') return invalidState();
      const parsed = checklistItemFormSchema
        .partial()
        .extend({ version: z.number() })
        .safeParse(await request.json());
      if (!parsed.success) return badRequest();
      if (versionMismatch(item.version, parsed.data.version)) return conflict();
      if (
        parsed.data.classification !== undefined &&
        !(item.classification === 'AUTO' && parsed.data.classification === 'MANUAL')
      )
        return error(400, 'CHECKLIST_4001', '자동 항목을 수동으로 옮기는 것만 가능합니다.');
      const changes = checklistItemFormSchema.partial().parse(parsed.data);
      if (Object.keys(changes).length > 0) {
        Object.assign(item, changes);
        item.version++;
        item.cells = item.parts.map((part) => {
          const old = item.cells.find((c) => c.part === part);
          const key = `${item.id}:${part}`;
          const history = record.fixture.cellHistory.get(key) ?? [];
          history.unshift({
            fromState: old?.state ?? 'UNCHECKED',
            toState: 'UNCHECKED',
            source: 'MANUAL',
            changedBy: 1,
            changedAt: now(),
            reason: '항목 수정으로 판정 초기화',
            evidence: [],
          });
          record.fixture.cellHistory.set(key, history);
          return {
            part,
            state: 'UNCHECKED',
            source: 'MANUAL',
            reason: null,
            evidence: [],
            editable: true,
            version: (old?.version ?? -1) + 1,
          };
        });
      }
      sync(record);
      return HttpResponse.json(item);
    }),
    http.delete(`${QA}/checklist-items/:id`, ({ params, request }) => {
      const failure = guard();
      if (failure) return failure;
      const found = findItem(Number(params.id));
      if (!found) return missing();
      const { record, item } = found;
      const version = new URL(request.url).searchParams.get('version');
      if (version === null || !/^\d+$/.test(version)) return badRequest();
      if (versionMismatch(item.version, Number(version))) return conflict();
      if (active(record) || record.sprint.status === 'CLOSED') return invalidState();
      record.fixture.items = record.fixture.items.filter((i) => i.id !== item.id);
      sync(record);
      return new HttpResponse(null, { status: 204 });
    }),
    http.put(`${QA}/checklist-items/:id/cells/:part`, async ({ params, request }) => {
      const failure = guard();
      if (failure) return failure;
      if (scenario() === 'verdict-delay' || scenario() === 'verdict-fail') {
        await delay(800);
        if (scenario() === 'verdict-fail')
          return error(500, 'GLOBAL_5001', '판정을 저장하지 못했습니다. 다시 시도해 주세요.');
      }
      const found = findItem(Number(params.id));
      if (!found) return missing();
      const part = partSchema.safeParse(params.part);
      if (!part.success) return badRequest();
      const { record, item } = found;
      const cell = item.cells.find((c) => c.part === part.data);
      if (!cell) return missing();
      const parsed = stateBody.safeParse(await request.json());
      if (!parsed.success) return badRequest();
      if (parsed.data.state === 'NOT_APPLICABLE')
        return error(400, 'CHECKLIST_4001', '체크 셀을 해당 없음으로 변경할 수 없습니다.');
      if (versionMismatch(cell.version, parsed.data.version)) return conflict();
      if (record.sprint.status !== 'MANUAL_REVIEW' || !cell.editable) return invalidState();
      if (unchangedFail(cell, parsed.data))
        return HttpResponse.json(compatibilityBody(cell, scenario()));
      const key = `${item.id}:${cell.part}`;
      const history = record.fixture.cellHistory.get(key) ?? [];
      history.unshift({
        fromState: cell.state,
        toState: parsed.data.state,
        source: 'MANUAL',
        changedBy: 1,
        changedAt: now(),
        reason:
          parsed.data.state === 'FAIL' && scenario() !== 'legacy'
            ? parsed.data.reason || null
            : null,
        evidence: [],
      });
      record.fixture.cellHistory.set(key, history);
      Object.assign(cell, {
        state: parsed.data.state,
        source: 'MANUAL',
        reason:
          parsed.data.state === 'FAIL' && scenario() !== 'legacy'
            ? parsed.data.reason || null
            : null,
        evidence: [],
        version: cell.version + 1,
      });
      sync(record);
      return HttpResponse.json(compatibilityBody(cell, scenario()));
    }),
    http.get(`${QA}/checklist-items/:id/cells/:part/history`, ({ params }) => {
      const failure = guard();
      if (failure) return failure;
      const found = findItem(Number(params.id));
      return found
        ? HttpResponse.json(
            compatibilityBody(
              found.record.fixture.cellHistory.get(`${params.id}:${params.part}`) ?? [],
              scenario(),
            ),
          )
        : missing();
    }),
  ];
}
