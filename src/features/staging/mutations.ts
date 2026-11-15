import { useMutation, useQueryClient } from '@tanstack/react-query';
import { promoteStagingLabel, updateStagingLesson } from '@/features/staging/api';
import { stagingKeys } from '@/features/staging/queries';

export function useUpdateStagingLesson(lessonId: number, label: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string }) => updateStagingLesson(lessonId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stagingKeys.detail(label) });
    },
  });
}

export function usePromoteStagingLabel(label: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => promoteStagingLabel(label),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stagingKeys.all });
    },
  });
}
