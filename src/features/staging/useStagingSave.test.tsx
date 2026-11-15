import { expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { renderWithProviders } from '@/test/render';
import { useStagingSave } from '@/features/staging/useStagingSave';
import { stagingKeys } from '@/features/staging/queries';

it.each([
  { failures: [], committed: [0, 1], message: '저장했어요.', invalidated: true },
  {
    failures: [1],
    committed: [0],
    message: '일부 항목만 저장했어요. (1/2 성공)',
    invalidated: true,
  },
  {
    failures: [0, 1],
    committed: [],
    message: '저장하지 못했어요. 다시 시도해 주세요.',
    invalidated: false,
  },
])(
  '부분 저장 결과 $failures — 성공한 작업만 baseline을 갱신해요',
  async ({ failures, committed, message, invalidated }) => {
    const commits: number[] = [];
    const success = vi.spyOn(toast, 'success');
    const error = vi.spyOn(toast, 'error');
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tasks = [0, 1].map((index) => ({
      run: async () => {
        await gate;
        if (failures.includes(index)) throw new Error('PATCH failed');
      },
      commit: () => commits.push(index),
    }));
    function Probe() {
      const { isSaving, save } = useStagingSave('label');
      return (
        <button disabled={isSaving} onClick={() => void save(tasks)}>
          {isSaving ? '저장 중' : '저장'}
        </button>
      );
    }
    const { client, unmount } = renderWithProviders(<Probe />);
    client.setQueryData(stagingKeys.detail('label'), {});
    try {
      await userEvent.setup().click(screen.getByRole('button', { name: '저장' }));
      expect(screen.getByRole('button', { name: '저장 중' })).toBeDisabled();
      expect(commits).toEqual([]);
      release();
      await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
      expect(commits).toEqual(committed);
      expect(client.getQueryState(stagingKeys.detail('label'))?.isInvalidated).toBe(invalidated);
      expect(failures.length === 0 ? success : error).toHaveBeenCalledWith(message);
    } finally {
      release();
      unmount();
      client.clear();
    }
  },
);
