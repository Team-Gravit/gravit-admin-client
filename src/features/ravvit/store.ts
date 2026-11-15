import { create } from 'zustand';
import { RavvitHttpError, checkHealth, sendChat } from '@/features/ravvit/api';
import type { BotMessage, ChatHistory, ChatMessage, ServiceStatus } from '@/features/ravvit/types';

/** 라우트 이탈 시 SSE를 유지하도록 전역 스토어에 두며, 사내 대화는 브라우저 저장소에 남기지 않습니다(D8-5). */

export const DEFAULT_ERROR_MESSAGE = '응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.';

let seq = 0;
const nextId = (): string => `m${(seq += 1)}`;

/** 진행 중 SSE 취소 핸들. 리렌더·직렬화 대상이 아니라 스토어 상태로 두지 않는다. */
let controller: AbortController | null = null;

function patchBot(
  messages: ChatMessage[],
  id: string,
  patch: (bot: BotMessage) => BotMessage,
): ChatMessage[] {
  return messages.map((m) => (m.role === 'assistant' && m.id === id ? patch(m) : m));
}

interface RavvitState {
  messages: ChatMessage[];

  history: ChatHistory;
  /** 직전 턴을 보낼 때 사용한 history 스냅샷. 재생성이 이 값으로 되돌린다. */
  pendingHistory: ChatHistory;
  service: ServiceStatus;
  isStreaming: boolean;
  lastQuestion: string | null;
  /** Empty 안내 문구 추출용 시드. 문구 후보는 닉네임 유무에 따라 달라져 화면이 조합한다. */
  greetingSeed: number;
  draft: string;

  setDraft: (value: string) => void;
  checkService: () => Promise<void>;
  send: (question: string) => Promise<void>;

  regenerate: () => Promise<void>;
  markRevealed: (id: string) => void;
  abort: () => void;
  reset: () => void;
}

export const useRavvitStore = create<RavvitState>((set, get) => {

  async function runTurn(question: string): Promise<void> {
    const botId = nextId();
    // 실패한 시도는 history 를 갱신하지 않으므로, 재시도해도 대화 맥락이 어긋나지 않는다 (§A-2).
    const historyAtSend = get().history;

    set((s) => ({
      messages: [
        ...s.messages,
        {
          role: 'assistant',
          id: botId,
          status: 'pending',
          toolLogs: [],
          answer: null,
          usage: null,
          errorMessage: null,
          revealed: false,
        },
      ],
      isStreaming: true,
      lastQuestion: question,
      pendingHistory: historyAtSend,
    }));

    controller = new AbortController();
    const { signal } = controller;

    try {
      await sendChat(
        question,
        historyAtSend,
        {
          onToolLog: (message) =>
            set((s) => ({
              messages: patchBot(s.messages, botId, (b) => ({
                ...b,
                toolLogs: [...b.toolLogs, message],
              })),
            })),
          onAnswer: (answer, history, usage) =>
            set((s) => ({
              history,
              messages: patchBot(s.messages, botId, (b) => ({
                ...b,
                status: 'done',
                answer,
                usage,
              })),
            })),
          onError: (message) =>
            set((s) => ({
              messages: patchBot(s.messages, botId, (b) => ({
                ...b,
                status: 'error',
                errorMessage: message,
              })),
            })),
        },
        signal,
      );
    } catch (error) {
      if (signal.aborted) {

        set((s) => ({
          messages: patchBot(s.messages, botId, (b) => ({ ...b, status: 'aborted' })),
        }));
      } else if (error instanceof RavvitHttpError && error.status === 403) {
        set({ service: 'forbidden' });
      } else if (error instanceof RavvitHttpError && error.status === 503) {
        set({ service: 'auth-unavailable' });
      }
    } finally {
      controller = null;
      // 종료 이벤트 없이 스트림이 끊긴 경우까지 여기서 확정한다(대기 상태로 남기지 않는다).
      set((s) => ({
        isStreaming: false,
        messages: patchBot(s.messages, botId, (b) =>
          b.status === 'pending' ? { ...b, status: 'error' } : b,
        ),
      }));
    }
  }

  return {
    messages: [],
    history: [],
    pendingHistory: [],
    service: 'checking',
    isStreaming: false,
    lastQuestion: null,
    greetingSeed: Math.floor(Math.random() * 1000),
    draft: '',

    setDraft: (draft) => set({ draft }),

    checkService: async () => {
      set({ service: 'checking' });
      try {
        await checkHealth();
        set({ service: 'ok' });
      } catch {
        set({ service: 'unreachable' });
      }
    },

    send: async (question) => {
      const trimmed = question.trim();
      if (!trimmed || get().isStreaming || get().service !== 'ok') return;
      set((s) => ({
        messages: [...s.messages, { role: 'user', id: nextId(), content: trimmed }],
        draft: '',
      }));
      await runTurn(trimmed);
    },

    // history 를 턴 이전 스냅샷으로 되돌리는 것이 핵심 — 현재 history 로 보내면
    // 방금 받은 답변이 맥락에 섞여 '재생성'이 아니라 '이어서 답하기'가 된다.
    regenerate: async () => {
      const { lastQuestion, isStreaming, messages, pendingHistory } = get();
      if (!lastQuestion || isStreaming) return;
      const last = messages[messages.length - 1];
      if (!last || last.role !== 'assistant') return;
      set({ messages: messages.slice(0, -1), history: pendingHistory });
      await runTurn(lastQuestion);
    },

    markRevealed: (id) =>
      set((s) => ({
        messages: patchBot(s.messages, id, (b) => ({ ...b, revealed: true })),
      })),

    abort: () => controller?.abort(),

    reset: () => {
      controller?.abort();
      set({
        messages: [],
        history: [],
        pendingHistory: [],
        lastQuestion: null,
        draft: '',
        greetingSeed: Math.floor(Math.random() * 1000),
      });
    },
  };
});
