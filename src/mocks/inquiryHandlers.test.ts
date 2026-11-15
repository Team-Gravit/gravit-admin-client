import { afterAll, beforeAll, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';
import { inquiryDetailSchema } from '@/features/inquiries/schemas';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
it.each([
  { method: 'POST', status: 201 },
  { method: 'PUT', status: 200 },
])('$method 문의 답변 목은 원문 content와 기존 상태코드를 유지해요', async ({ method, status }) => {
  const content = '  확인했습니다.\n추가 안내입니다.  ';
  const response = await fetch('http://localhost:5999/api/v1/admin/inquiries/5001/answer', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  expect(response.status).toBe(status);
  const result = inquiryDetailSchema.parse(await response.json());
  expect(result.answer?.content).toBe(content);
  expect(result.inquiryId).toBe(5001);
  expect(result.status).toBe('RESOLVED');
});
