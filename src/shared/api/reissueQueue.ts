/** axios 호출을 client.ts에 남겨 순환 의존 없이 재발급 대기 요청에 같은 결과를 전달합니다. */
type Waiter = (token: string | null) => void;

let isReissuing = false;
let waiters: Waiter[] = [];

export const reissueQueue = {
  get isReissuing(): boolean {
    return isReissuing;
  },
  begin(): void {
    isReissuing = true;
  },
  end(): void {
    isReissuing = false;
  },
  subscribe(): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      waiters.push(resolve);
    });
  },
  publish(token: string | null): void {
    const current = waiters;
    waiters = [];
    current.forEach((resolve) => resolve(token));
  },
};
