import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { toast } from 'sonner';
import { env } from '@/env';
import { ROUTES } from '@/shared/constants/routes';
import { tokenManager } from '@/shared/api/tokenManager';
import { reissueQueue } from '@/shared/api/reissueQueue';

const API_V1 = `${env.VITE_API_HOST}/api/v1`;
const TIMEOUT = 30_000;

export const authApiClient = axios.create({
  baseURL: API_V1,
  timeout: TIMEOUT,
  withCredentials: true,
});
export const apiClient = axios.create({ baseURL: `${API_V1}/admin`, timeout: TIMEOUT });

const reissueResponseSchema = z.object({
  accessToken: z.string().min(1),
});

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

apiClient.interceptors.request.use((config) => {
  const accessToken = tokenManager.getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

function forceLogout(): void {
  tokenManager.clear();
  toast.error('다시 로그인해주세요.');
  window.location.href = ROUTES.LOGIN;
}

/** refresh Rotation 경쟁을 막기 위해 axios·Ravvit·QA가 단일 재발급 절차를 공유합니다(D8-3). */
export async function refreshAccessToken(): Promise<string | null> {

  if (reissueQueue.isReissuing) {
    return reissueQueue.subscribe();
  }

  reissueQueue.begin();
  try {
    // 웹은 본문 없이 HttpOnly refreshToken 쿠키로 재발급한다.
    const { data } = await authApiClient.post('/auth/reissue');
    const { accessToken } = reissueResponseSchema.parse(data);
    tokenManager.setAccessToken(accessToken);
    reissueQueue.publish(accessToken);
    return accessToken;
  } catch {
    reissueQueue.publish(null);
    return null;
  } finally {
    reissueQueue.end();
  }
}

export async function reissueAccessToken(): Promise<string | null> {
  const accessToken = await refreshAccessToken();
  if (!accessToken) forceLogout();
  return accessToken;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableRequest | undefined;

    if (error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    const accessToken = await reissueAccessToken();
    if (!accessToken) return Promise.reject(error);

    original.headers.Authorization = `Bearer ${accessToken}`;
    return apiClient.request(original);
  },
);
