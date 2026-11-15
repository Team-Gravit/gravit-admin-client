import { z } from 'zod';

/** Ravvit은 백오피스와 별도 서비스여서 표준 envelope를 사용하지 않습니다(D8-2). */

export const healthResponseSchema = z.object({
  status: z.string(),
  model: z.string(),
  tools: z.array(z.string()),
  auth: z.string(),
});

/** 서버가 해석하는 불투명 history는 unknown으로 받아 가공 없이 다음 요청에 돌려보냅니다(D8-2). */
export const chatHistorySchema = z.array(z.unknown());

export const chatUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadInputTokens: z.number(),
});

// SSE 이벤트 3종 — tool_log 0회 이상 → answer 또는 error 1회로 종료
export const toolLogEventSchema = z.object({ message: z.string() });

export const answerEventSchema = z.object({
  answer: z.string(),
  history: chatHistorySchema,
  usage: chatUsageSchema.optional(),
});

export const errorEventSchema = z.object({ message: z.string() });

export type ChatHistory = z.infer<typeof chatHistorySchema>;
export type ChatUsage = z.infer<typeof chatUsageSchema>;
