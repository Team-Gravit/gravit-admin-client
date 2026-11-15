import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { buildFixture, checklistResponse, designResponse } from '@/mocks/qaChecklist';
import { refreshSprint, replaceCheckCell, replaceDesignItem } from '@/features/qa/cache';
import { qaKeys } from '@/features/qa/queryKeys';

describe('QA cache', () => {
  it('지정한 항목의 파트와 서버 version만 교체하고 원본·다른 셀·집계를 보존해요', () => {
    const before = checklistResponse(2, 'MANUAL_REVIEW', buildFixture(2), 1);
    const feature = before.features[0];
    const item = feature?.items[0];
    const cell = item?.cells[0];
    if (!feature || !item || !cell) throw new Error('fixture missing');
    const updated = { ...cell, version: 9, reason: '수동 확인' };
    const after = replaceCheckCell(before, item.id, cell.part, updated);
    expect(after?.features[0]?.items[0]?.cells[0]).toBe(updated);
    expect(after?.features[0]?.items[0]?.cells[1]).toBe(item.cells[1]);
    expect(after?.features[0]?.items[1]).toBe(feature.items[1]);
    expect(after?.features[0]?.completionRate).toBe(feature.completionRate);
    expect(before.features[0]?.items[0]?.cells[0]).toBe(cell);
    expect(replaceCheckCell(undefined, item.id, cell.part, updated)).toBeUndefined();
  });
  it('디자인 응답의 대상 항목만 교체하고 집계를 계산하지 않아요', () => {
    const before = designResponse(2, 'MANUAL_REVIEW', buildFixture(2));
    const item = before.features[0]?.items[0];
    if (!item) throw new Error('fixture missing');
    const updated = { ...item, version: 7 };
    const after = replaceDesignItem(before, updated);
    expect(after?.features[0]?.items[0]).toBe(updated);
    expect(after?.features[0]?.items[1]).toBe(before.features[0]?.items[1]);
    expect(after?.features[0]?.completionRate).toBe(before.features[0]?.completionRate);
    expect(replaceDesignItem(undefined, updated)).toBeUndefined();
  });
  it('현재 sprint의 두 round와 집계 6종을 무효화하고 다른 sprint는 보존해요', async () => {
    const client = new QueryClient();
    const affected = [
      qaKeys.sprint(2),
      qaKeys.sprintLists(),
      qaKeys.checklist(2, 1),
      qaKeys.checklist(2, 2),
      qaKeys.design(2),
      qaKeys.reflections(2),
      qaKeys.fixReports(2),
    ];
    for (const key of [...affected, qaKeys.checklist(3, 1), qaKeys.job(9)])
      client.setQueryData(key, {});
    await refreshSprint(client, 2);
    for (const key of affected) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(client.getQueryState(qaKeys.checklist(3, 1))?.isInvalidated).toBe(false);
    expect(client.getQueryState(qaKeys.job(9))?.isInvalidated).toBe(false);
    client.clear();
  });
});
