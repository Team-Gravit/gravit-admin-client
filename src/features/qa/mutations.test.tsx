import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { renderWithProviders } from '@/test/render';
import { buildFixture, checklistResponse } from '@/mocks/qaChecklist';
import { useUpdateCheckCell } from '@/features/qa/mutations';
import { useSprint } from '@/features/qa/queries';
import { qaKeys } from '@/features/qa/queryKeys';
import type { Checklist, Sprint } from '@/features/qa/schemas';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const sprint: Sprint = {
  id: 2,
  sprintKey: '2th Agile',
  summary: null,
  status: 'MANUAL_REVIEW',
  version: 1,
  connections: [],
  progress: [],
  setupSteps: [],
  latestJob: null,
  pendingReflectionCount: 0,
};

it('셀 응답을 먼저 반영하고 활성 sprint 재조회가 끝날 때까지 저장 중을 유지해요', async () => {
  const checklist = checklistResponse(2, 'MANUAL_REVIEW', buildFixture(2), 1);
  const item = checklist.features[0]?.items[0];
  const cell = item?.cells[0];
  if (!item || !cell) throw new Error('fixture missing');
  const updated = { ...cell, version: 8 };
  const variables = {
    itemId: item.id,
    part: cell.part,
    state: 'PASS' as const,
    version: cell.version,
  };
  let reads = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    http.get('*/qa-api/sprints/2', async () => {
      reads += 1;
      if (reads > 1) await gate;
      return HttpResponse.json(sprint);
    }),
    http.put(`*/qa-api/checklist-items/${item.id}/cells/${cell.part}`, async ({ request }) => {
      expect(await request.json()).toEqual({ state: 'PASS', version: cell.version });
      return HttpResponse.json(updated);
    }),
  );
  function Probe() {
    const query = useSprint(2);
    const mutation = useUpdateCheckCell(2, 1);
    return (
      <button
        disabled={!query.data || mutation.isPending}
        onClick={() => mutation.mutate(variables)}
      >
        {mutation.isPending ? '저장 중' : '저장'}
      </button>
    );
  }
  const { client, unmount } = renderWithProviders(<Probe />);
  client.setQueryData(qaKeys.checklist(2, 1), checklist);
  try {
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    await userEvent.setup().click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(reads).toBe(2));
    expect(
      client.getQueryData<Checklist>(qaKeys.checklist(2, 1))?.features[0]?.items[0]?.cells[0]
        ?.version,
    ).toBe(8);
    expect(screen.getByRole('button', { name: '저장 중' })).toBeDisabled();
    release();
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
  } finally {
    release();
    unmount();
    client.clear();
  }
});
