import { z } from 'zod';

const envSchema = z.object({
  VITE_API_HOST: z.string().url(),
  VITE_OAUTH_DEST: z.string().min(1),
  // Ravvit(챗봇) API base (D8-4). 프록시 경로(`/ravvit-api`) 또는 절대 URL 둘 다 허용하므로 .url() 아님.
  VITE_RAVVIT_API_BASE: z.string().min(1),
  // QA(gravit-qa) API base (D9-2). 필수 아님 — 기존 개발자의 .env 가 이 변수 때문에 깨지지 않게 기본값을 둔다.
  VITE_QA_API_BASE: z.string().min(1).default('/qa-api'),
  VITE_USE_MOCK: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('환경 변수 검증 실패:', parsed.error.flatten().fieldErrors);
  throw new Error('환경 변수가 올바르지 않습니다. .env 파일을 확인해주세요.');
}

export const env = parsed.data;
