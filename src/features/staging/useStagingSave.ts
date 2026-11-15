import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { stagingKeys } from '@/features/staging/queries';

export interface StagingSaveTask {
  run: () => Promise<unknown>;
  commit: () => void;
}

export function useStagingSave(label: string) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const save = async (tasks: StagingSaveTask[]) => {
    if (tasks.length === 0) return;
    setIsSaving(true);
    const results = await Promise.allSettled(tasks.map((task) => task.run()));
    setIsSaving(false);
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') tasks[index]?.commit();
    });
    const failed = results.filter((result) => result.status === 'rejected').length;
    if (failed < results.length) {
      void queryClient.invalidateQueries({ queryKey: stagingKeys.detail(label) });
    }
    if (failed === 0) {
      toast.success('저장했어요.');
    } else if (failed < results.length) {
      toast.error(`일부 항목만 저장했어요. (${results.length - failed}/${results.length} 성공)`);
    } else {
      toast.error('저장하지 못했어요. 다시 시도해 주세요.');
    }
  };
  return { isSaving, save };
}
