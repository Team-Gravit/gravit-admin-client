import { env } from '@/env';
import { reissueAccessToken } from '@/shared/api/client';
import { tokenManager } from '@/shared/api/tokenManager';
import {
  answerEventSchema,
  errorEventSchema,
  healthResponseSchema,
  toolLogEventSchema,
} from '@/features/ravvit/schemas';
import type { ChatHistory, ChatUsage } from '@/features/ravvit/types';

/** 브라우저 axios는 응답 스트리밍을 지원하지 않아 SSE를 fetch로 읽습니다(D8-2·D8-5). */
const BASE = env.VITE_RAVVIT_API_BASE;

export class RavvitHttpError extends Error {
  constructor(readonly status: number) {
    super(`RAVVIT_HTTP_${status}`);
    this.name = 'RavvitHttpError';
  }
}

export async function checkHealth(): Promise<void> {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new RavvitHttpError(res.status);
  healthResponseSchema.parse(await res.json());
}

export interface ChatEventHandlers {
  onToolLog: (message: string) => void;
  onAnswer: (answer: string, history: ChatHistory, usage: ChatUsage | null) => void;
  onError: (message: string) => void;
}

function postChat(
  question: string,
  history: ChatHistory,
  accessToken: string | null,
  signal: AbortSignal,
): Promise<Response> {
  return fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ question, history }),
    signal,
  });
}

/** refresh Rotation 경쟁을 막기 위해 401 재발급을 공통 절차와 공유합니다(D8-3). */
export async function sendChat(
  question: string,
  history: ChatHistory,
  handlers: ChatEventHandlers,
  signal: AbortSignal,
): Promise<void> {
  let res = await postChat(question, history, tokenManager.getAccessToken(), signal);

  if (res.status === 401) {
    const renewed = await reissueAccessToken();
    if (!renewed) throw new RavvitHttpError(401);
    res = await postChat(question, history, renewed, signal);
  }

  if (!res.ok || !res.body) throw new RavvitHttpError(res.status);
  await readSSE(res.body, handlers);
}

async function readSSE(
  body: ReadableStream<Uint8Array>,
  handlers: ChatEventHandlers,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // 이벤트 구분자는 빈 줄(\n\n). 경계에 걸친 청크는 buffer 에 남겨 다음 read 와 합친다.
    for (;;) {
      const sep = buffer.indexOf('\n\n');
      if (sep === -1) break;
      dispatch(buffer.slice(0, sep), handlers);
      buffer = buffer.slice(sep + 2);
    }
  }
}

function dispatch(chunk: string, handlers: ChatEventHandlers): void {
  let event = 'message';
  let data = '';
  for (const line of chunk.split('\n')) {
    if (line.startsWith('event: ')) event = line.slice(7);
    else if (line.startsWith('data: ')) data += line.slice(6);
  }
  if (!data) return;

  const payload: unknown = JSON.parse(data);
  if (event === 'tool_log') {
    handlers.onToolLog(toolLogEventSchema.parse(payload).message);
  } else if (event === 'answer') {
    const { answer, history, usage } = answerEventSchema.parse(payload);
    handlers.onAnswer(answer, history, usage ?? null);
  } else if (event === 'error') {
    handlers.onError(errorEventSchema.parse(payload).message);
  }
}
