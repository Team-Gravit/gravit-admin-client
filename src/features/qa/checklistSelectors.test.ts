import { expect, it } from 'vitest';
import { buildFixture, checklistResponse } from '@/mocks/qaChecklist';
import {
  filterChecklistFeatures,
  checklistNavigationEntries,
} from '@/features/qa/checklistSelectors';

it('파트 필터는 항목·그룹 순서와 원본을 보존하고 빈 그룹만 제외해요', () => {
  const features = checklistResponse(2, 'MANUAL_REVIEW', buildFixture(2), 1).features;
  const empty = {
    ...features[0],
    featureId: 99,
    screenId: 'EMPTY',
    screenName: 'empty',
    changed: false,
    completionRate: 0,
    items: [],
  };
  const filtered = filterChecklistFeatures([...features, empty], 'SERVER');
  expect(filtered.map((feature) => feature.featureId)).toEqual(
    features.map((feature) => feature.featureId),
  );
  expect(filtered[0]?.items.map((item) => item.title)).toEqual([
    '로그인 버튼 동작',
    '필수 입력 안내',
  ]);
  expect(features[0]?.items).toHaveLength(3);
  expect(filterChecklistFeatures([...features, empty], 'ALL')).toHaveLength(3);
});
it('미검수 이동은 그룹·항목·파트 순서이며 편집 불가와 CLOSED를 제외해요', () => {
  const features = checklistResponse(2, 'MANUAL_REVIEW', buildFixture(2), 1).features;
  const entries = checklistNavigationEntries(features, ['SERVER', 'WEB'], false);
  expect(entries.slice(0, 2).map((entry) => entry.key)).toEqual(['21000:SERVER', '21000:WEB']);
  expect(entries.filter((entry) => entry.unchecked).map((entry) => entry.key)).toEqual([
    '21001:SERVER',
    '21002:WEB',
    '21101:SERVER',
    '21102:WEB',
  ]);
  expect(
    checklistNavigationEntries(features, ['SERVER', 'WEB'], true).every(
      (entry) => !entry.unchecked,
    ),
  ).toBe(true);
});
