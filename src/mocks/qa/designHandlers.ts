import { env } from '@/env';
import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';
import { designResponse } from '@/mocks/qaChecklist';
import type { QaMockState } from '@/mocks/qa/state';

const QA = env.VITE_QA_API_BASE;

export function createDesignHandlers(state: QaMockState) {
  const {
    scenario,
    now,
    error,
    conflict,
    invalidState,
    versionBody,
    stateBody,
    unchangedFail,
    records,
    sync,
    guard,
    versionMismatch,
    findDesign,
    active,
    missing,
    badRequest,
  } = state;
  return [
    http.get(`${QA}/sprints/:id/design-review`, ({ params }) => {
      const failure = guard();
      if (failure) return failure;
      const record = records.get(Number(params.id));
      return record
        ? HttpResponse.json(
            ['DRAFT', 'SPEC_LOAD', 'CHECKLIST'].includes(record.sprint.status)
              ? { sprintId: record.sprint.id, sprintStatus: record.sprint.status, features: [] }
              : designResponse(record.sprint.id, record.sprint.status, record.fixture),
          )
        : missing();
    }),
    http.put(`${QA}/design-review-items/:id`, async ({ params, request }) => {
      const failure = guard();
      if (failure) return failure;
      if (scenario() === 'verdict-delay' || scenario() === 'verdict-fail') {
        await delay(800);
        if (scenario() === 'verdict-fail')
          return error(500, 'GLOBAL_5001', '판정을 저장하지 못했습니다. 다시 시도해 주세요.');
      }
      const found = findDesign(Number(params.id));
      if (!found) return missing();
      const { record, item } = found;
      const parsed = stateBody.safeParse(await request.json());
      if (!parsed.success) return badRequest();
      if (scenario() === 'legacy' && parsed.data.state === 'NOT_APPLICABLE') return badRequest();
      if (versionMismatch(item.version, parsed.data.version)) return conflict();
      if (record.sprint.status === 'CLOSED' || !item.editable) return invalidState();
      if (unchangedFail(item, parsed.data)) return HttpResponse.json(item);
      Object.assign(item, {
        state: parsed.data.state,
        source: 'MANUAL',
        reason:
          parsed.data.state === 'FAIL' && scenario() !== 'legacy'
            ? parsed.data.reason || null
            : null,
        version: item.version + 1,
      });
      record.fixture.designHistory.get(item.id)?.unshift({
        state: item.state,
        source: 'MANUAL',
        reason: item.reason,
        updatedBy: 1,
        updatedAt: now(),
      });
      sync(record);
      return HttpResponse.json(item);
    }),
    http.get(`${QA}/design-review-items/:id/history`, ({ params }) => {
      const failure = guard();
      if (failure) return failure;
      const found = findDesign(Number(params.id));
      return found
        ? HttpResponse.json(found.record.fixture.designHistory.get(found.item.id) ?? [])
        : missing();
    }),
    http.patch(`${QA}/design-review-items/:id`, async ({ params, request }) => {
      const failure = guard();
      if (failure) return failure;
      if (scenario() === 'legacy') return missing();
      const found = findDesign(Number(params.id));
      if (!found) return missing();
      const { record, item } = found;
      const parsed = versionBody
        .extend({
          title: z.string().trim().min(1).optional(),
          expected: z.string().trim().min(1).optional(),
        })
        .safeParse(await request.json());
      if (!parsed.success) return badRequest();
      if (versionMismatch(item.version, parsed.data.version)) return conflict();
      if (active(record) || record.sprint.status === 'CLOSED' || !item.editable)
        return invalidState();
      const title = parsed.data.title ?? item.title;
      const expected = parsed.data.expected ?? item.expected;
      if (title !== item.title || expected !== item.expected) {
        Object.assign(item, {
          title,
          expected,
          state: 'UNCHECKED',
          source: 'MANUAL',
          reason: null,
          version: item.version + 1,
        });
        const history = record.fixture.designHistory.get(item.id) ?? [];
        history.unshift({
          state: 'UNCHECKED',
          source: 'MANUAL',
          reason: '항목 수정으로 판정 초기화',
          updatedBy: 1,
          updatedAt: now(),
        });
        record.fixture.designHistory.set(item.id, history);
      }
      sync(record);
      return HttpResponse.json(item);
    }),
    http.delete(`${QA}/design-review-items/:id`, ({ params, request }) => {
      const failure = guard();
      if (failure) return failure;
      if (scenario() === 'legacy') return missing();
      const found = findDesign(Number(params.id));
      if (!found) return missing();
      const { record, item } = found;
      const version = new URL(request.url).searchParams.get('version');
      if (version === null || !/^\d+$/.test(version)) return badRequest();
      if (versionMismatch(item.version, Number(version))) return conflict();
      if (active(record) || record.sprint.status === 'CLOSED' || !item.editable)
        return invalidState();
      record.fixture.design = record.fixture.design.filter((entry) => entry.id !== item.id);
      sync(record);
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}
