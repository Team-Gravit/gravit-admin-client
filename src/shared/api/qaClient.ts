import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { env } from '@/env';
import { reissueAccessToken } from '@/shared/api/client';
import { tokenManager } from '@/shared/api/tokenManager';

/** QA는 별도 Base·오류 계약을 사용합니다. 401 재발급은 공통 절차를 공유하고, 503은 재발급·로그아웃 사유로 취급하지 않습니다(D9-2·D9-3). */
const TIMEOUT = 30_000;

export const qaApiClient = axios.create({ baseURL: env.VITE_QA_API_BASE, timeout: TIMEOUT });

/** QA_SPEC F-5 중 HTTP 계층 공통 문구. 도메인 문구(Notion 미발견·중복 등)는 features/qa 가 가진다. */
export const QA_ERROR_MESSAGES = {
  AUTH_UNAVAILABLE:
    '인증 서버가 응답하지 않아 권한을 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.',
  FORBIDDEN: 'QA 메뉴를 사용할 권한이 없어요.',
  DEFAULT: '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.',
} as const;

const qaErrorBodySchema = z.object({
  error: z.string(),
  message: z.union([z.string(), z.array(z.string()), z.record(z.unknown())]),
});

export class QaApiError extends Error {
  constructor(
    /** HTTP 상태. 응답이 없으면(네트워크·타임아웃) null. */
    readonly status: number | null,

    message: string,
    /** 서버가 준 문자열 message. 객체(필드별 오류)거나 없으면 null. */
    readonly serverMessage: string | null,

    readonly code: string | null = null,
    /** 재발급 실패로 강제 로그아웃이 이미 안내한 실패 — 화면은 다시 알리지 않는다(D9-3). */
    readonly sessionEnded = false,
  ) {
    super(message);
    this.name = 'QaApiError';
  }
}

function toQaApiError(error: unknown): QaApiError {
  if (!(error instanceof AxiosError) || !error.response) {
    return new QaApiError(null, QA_ERROR_MESSAGES.DEFAULT, null);
  }
  const { status, data } = error.response;
  const body = qaErrorBodySchema.safeParse(data);
  const serverMessage =
    body.success && typeof body.data.message === 'string' && body.data.message.length > 0
      ? body.data.message
      : null;
  const code = body.success ? body.data.error : null;

  if (status === 503) {
    return new QaApiError(status, QA_ERROR_MESSAGES.AUTH_UNAVAILABLE, serverMessage, code);
  }
  const fallback = status === 403 ? QA_ERROR_MESSAGES.FORBIDDEN : QA_ERROR_MESSAGES.DEFAULT;
  return new QaApiError(status, serverMessage ?? fallback, serverMessage, code);
}

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

qaApiClient.interceptors.request.use((config) => {
  const accessToken = tokenManager.getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

qaApiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const original =
      error instanceof AxiosError ? (error.config as RetryableRequest | undefined) : undefined;

    if (
      error instanceof AxiosError &&
      error.response?.status === 401 &&
      original &&
      !original._retry
    ) {
      original._retry = true;

      const accessToken = await reissueAccessToken();
      if (!accessToken) {
        const ended = toQaApiError(error);
        return Promise.reject(
          new QaApiError(ended.status, ended.message, ended.serverMessage, ended.code, true),
        );
      }

      original.headers.Authorization = `Bearer ${accessToken}`;
      return qaApiClient.request(original);
    }
    return Promise.reject(toQaApiError(error));
  },
);

/** 스키마 실패도 QA 문구를 유지하며, 실제 2xx 상태를 보존해 자동 재시도를 막습니다(D9-5). */
export function parseQaResponse<S extends z.ZodTypeAny>(
  schema: S,
  response: { status: number; data: unknown },
): z.infer<S> {
  const parsed = schema.safeParse(response.data);
  if (!parsed.success) {
    if (import.meta.env.DEV) {
      console.error(
        '[QA] 응답 스키마 파싱 실패',
        parsed.error.issues.map(({ path, code }) => ({ path, code })),
      );
    }
    throw new QaApiError(response.status, QA_ERROR_MESSAGES.DEFAULT, null);
  }
  return parsed.data;
}

/** 4xx·503·응답 파싱 실패는 재시도하지 않고 네트워크·기타 5xx만 1회 재시도합니다(D9-3). */
export function qaQueryRetry(failureCount: number, error: unknown): boolean {
  if (!(error instanceof QaApiError)) return false;
  if (error.status !== null && (error.status < 500 || error.status === 503)) return false;
  return failureCount < 1;
}
