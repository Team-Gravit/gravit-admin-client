import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gravit_admin_session', 'true'));
});

for (const scenario of [
  { path: '/users', endpoint: '/users', index: 0, option: '정지', key: 'status', value: 'SUSPENDED' },
  { path: '/users', endpoint: '/users', index: 1, option: '관리자', key: 'role', value: 'ADMIN' },
  { path: '/reports', endpoint: '/reports', index: 0, option: '오타', key: 'reportType', value: 'TYPO_ERROR' },
  { path: '/reports', endpoint: '/reports', index: 1, option: '해결됨', key: 'isResolved', value: 'true' },
  { path: '/inquiries', endpoint: '/inquiries', index: 0, option: '답변완료', key: 'status', value: 'RESOLVED' },
  { path: '/staging/labels', endpoint: '/staging/labels', index: 0, option: '반영 완료', key: 'status', value: 'COMPLETED' },
]) {
  test(`${scenario.path}에서 ${scenario.option} 선택 시 기존 조회 조건과 페이지를 전송한다`, async ({ page }) => {
    await page.goto(scenario.path);
    await expect(page.getByRole('table')).toBeVisible();
    const requested = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return request.method() === 'GET' && url.pathname.endsWith(scenario.endpoint) && url.searchParams.get(scenario.key) === scenario.value;
    });
    await page.getByRole('combobox').nth(scenario.index).click();
    await page.getByRole('option', { name: scenario.option, exact: true }).click();
    const url = new URL((await requested).url());
    expect(url.searchParams.get('page')).toBe('1');
    await expect(page.getByRole('combobox').nth(scenario.index)).toContainText(scenario.option);
  });
}
