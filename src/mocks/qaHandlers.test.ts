import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { createQaHandlers } from '@/mocks/qaHandlers';
import { createQaMockState } from '@/mocks/qa/state';
import {
  checkCellSchema,
  checklistSchema,
  checkCellHistoryListSchema,
} from '@/features/qa/schemas';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const base = 'http://localhost:3000/qa-api';

it('state factory는 Map·Set·ID와 seed 객체를 공유하지 않아요', () => {
  const first = createQaMockState(() => null);
  const second = createQaMockState(() => null);
  const record = first.records.get(2);
  if (!record) throw new Error('fixture missing');
  record.sprint.version = 42;
  first.failedApproval.add(600);
  first.ids.item++;
  first.jobs.clear();
  expect(second.records.get(2)?.sprint.version).toBe(0);
  expect(second.failedApproval.has(600)).toBe(false);
  expect(second.ids.item).toBe(900000);
  expect(second.jobs.size).toBeGreaterThan(0);
  expect([...second.records.keys()]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
});
it('한 handler 인스턴스의 판정·이력 변경은 다른 인스턴스와 새 factory에 남지 않아요', async () => {
  const first = createQaHandlers(() => null);
  const second = createQaHandlers(() => null);
  server.use(...first);
  const response = await fetch(`${base}/checklist-items/21001/cells/WEB`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'PASS', version: 0 }),
  });
  expect(response.status).toBe(200);
  expect(checkCellSchema.parse(await response.json()).version).toBe(1);
  const changedHistory = await fetch(`${base}/checklist-items/21001/cells/WEB/history`);
  expect(checkCellHistoryListSchema.parse(await changedHistory.json())).toHaveLength(2);
  for (const handlers of [second, createQaHandlers(() => null)]) {
    server.resetHandlers(...handlers);
    const result = await fetch(`${base}/sprints/2/checklist?round=1`);
    const item = checklistSchema.parse(await result.json()).features[0]?.items[1];
    expect(item?.cells.find((cell) => cell.part === 'WEB')).toMatchObject({
      state: 'FAIL',
      version: 0,
      source: 'AUTO',
    });
    const history = await fetch(`${base}/checklist-items/21001/cells/WEB/history`);
    expect(checkCellHistoryListSchema.parse(await history.json())).toHaveLength(1);
  }
});
it('시나리오는 요청마다 읽으며 legacy는 evidence 키만 생략해요', async () => {
  let scenario: string | null = 'legacy';
  server.use(...createQaHandlers(() => scenario));
  const response = await fetch(`${base}/sprints/2/checklist?round=1`);
  const raw: unknown = await response.json();
  const checklist = checklistSchema.parse(raw);
  expect(checklist.features[0]?.items[0]?.cells[0]?.evidence).toEqual([]);
  expect(JSON.stringify(raw)).not.toContain('evidence');
  scenario = '403';
  expect((await fetch(`${base}/sprints/2`)).status).toBe(403);
});
