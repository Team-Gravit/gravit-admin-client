import { afterAll, beforeAll, expect, it } from 'vitest';
import { focusManager } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { renderWithProviders } from '@/test/render';
import { useSetupJob } from '@/features/qa/queries';
import type { Job } from '@/features/qa/schemas';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
const job: Job = {
  id: 99,
  type: 'QA_PREPARE',
  sprintId: 2,
  status: 'RUNNING',
  attempt: 1,
  maxAttempts: 3,
  nextRunAt: null,
  cancelRequested: false,
  lastError: null,
  steps: [],
  createdAt: '2026-11-11T10:00:00+09:00',
  finishedAt: null,
};

it('진행 중 job 조회가 403이면 자동 재시도와 다음 polling을 멈춰요', async () => {
  let reads = 0;
  server.use(
    http.get('*/qa-api/jobs/99', () => {
      reads += 1;
      return HttpResponse.json({ error: 'FORBIDDEN', message: '권한이 없어요.' }, { status: 403 });
    }),
  );
  function Probe() {
    const query = useSetupJob(2, job);
    return <p>{query.isError ? '조회 오류' : '진행 중'}</p>;
  }
  focusManager.setFocused(true);
  const { client, unmount } = renderWithProviders(<Probe />);
  try {
    await waitFor(() => expect(screen.getByText('조회 오류')).toBeInTheDocument(), {
      timeout: 5000,
    });
    await new Promise((resolve) => setTimeout(resolve, 3200));
    expect(reads).toBe(1);
  } finally {
    unmount();
    client.clear();
    focusManager.setFocused(undefined);
  }
}, 10000);
