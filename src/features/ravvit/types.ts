import type { ChatHistory, ChatUsage } from '@/features/ravvit/schemas';

export type { ChatHistory, ChatUsage };

export type ServiceStatus =
  | 'checking'
  | 'ok'
  | 'unreachable'
  | 'forbidden'
  | 'auth-unavailable';

export type BotStatus = 'pending' | 'done' | 'error' | 'aborted';

export interface UserMessage {
  role: 'user';
  id: string;
  content: string;
}

export interface BotMessage {
  role: 'assistant';
  id: string;
  status: BotStatus;
  toolLogs: string[];
  answer: string | null;
  usage: ChatUsage | null;

  errorMessage: string | null;
  /** 답변 표시 완료를 알렸는지. 재렌더·재진입 시 표시/스크롤 알림을 반복하지 않는다. */
  revealed: boolean;
}

export type ChatMessage = UserMessage | BotMessage;
