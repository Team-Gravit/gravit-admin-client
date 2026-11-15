import { env } from '@/env';
import { delay, http, HttpResponse } from 'msw';
import { progressPartSchema } from '@/features/qa/schemas';
import type { QaMockState } from '@/mocks/qa/state';

const QA = env.VITE_QA_API_BASE;

export function createFixReportHandlers(state: QaMockState) {
  const { scenario, error, records, guard, missing, badRequest, fixReportsOf } = state;
  return [
    http.get(`${QA}/sprints/:id/fix-reports`, async ({ params }) => {
      const failure = guard();
      if (failure) return failure;
      if (scenario() === 'legacy') return missing();
      if (scenario() === 'fixes-loading') await delay(600);
      const record = records.get(Number(params.id));
      return record ? HttpResponse.json(fixReportsOf(record)) : missing();
    }),
    http.get(`${QA}/sprints/:id/fix-reports/:part`, ({ params }) => {
      const failure = guard();
      if (failure) return failure;
      if (scenario() === 'legacy' || scenario() === 'fixes-download-404') return missing();
      const record = records.get(Number(params.id));
      if (!record) return missing();
      const part = progressPartSchema.safeParse(params.part);
      if (!part.success) return badRequest();
      if (!fixReportsOf(record).ready || scenario() === 'fixes-download-conflict')
        return error(409, 'SPRINT_4093', '검수가 완료되지 않았습니다.');
      // Temporary transfer fixture: the server prompt's TXT example has not been supplied.
      // This is deliberately labelled as a mock, not an assertion of the server's TXT layout.
      const entries =
        part.data === 'DESIGN'
          ? record.fixture.design
              .filter((item) => item.state === 'FAIL')
              .map((item) => `${item.title}\n${item.reason ?? ''}`)
          : record.fixture.items.flatMap((item) =>
              item.cells
                .filter((cell) => cell.part === part.data && cell.state === 'FAIL')
                .map((cell) => `${item.title}\n${cell.reason ?? ''}`),
            );
      return new HttpResponse(
        [
          '임시 목 TXT — 서버 계약 예시 틀 확인 필요',
          `${record.sprint.sprintKey} / ${part.data}`,
          ...entries,
        ].join('\n\n'),
        {
          headers: {
            'Content-Type': 'text/plain; charset=UTF-8',
            'Content-Disposition': 'attachment; filename="ignored-header.txt"',
          },
        },
      );
    }),
  ];
}
