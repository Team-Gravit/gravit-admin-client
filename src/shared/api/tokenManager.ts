/** 토큰은 메모리·HttpOnly 쿠키에 두며, localStorage 힌트는 인증 증거가 아닙니다. 세션은 쿠키 재발급 결과로 판정합니다. */
const SESSION_HINT_KEY = 'gravit_admin_session';
const LEGACY_REFRESH_TOKEN_KEY = 'gravit_admin_refresh_token';

let accessTokenInMemory: string | null = null;

export const tokenManager = {
  getAccessToken: (): string | null => accessTokenInMemory,
  setAccessToken: (token: string): void => {
    accessTokenInMemory = token;
    localStorage.setItem(SESSION_HINT_KEY, 'true');
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  },

  hasSession: (): boolean => localStorage.getItem(SESSION_HINT_KEY) === 'true',

  clear: (): void => {
    accessTokenInMemory = null;
    localStorage.removeItem(SESSION_HINT_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  },
};
