import { apiClient } from '@/shared/api/client';
import type { StagingStatus } from '@/shared/constants/enums';
import {
  stagingLabelDetailSchema,
  stagingLabelListResponseSchema,
  type StagingLabelDetail,
  type StagingLabelListResponse,
} from '@/features/staging/schemas';

export async function getStagingLabels(
  page: number,
  status?: StagingStatus,
): Promise<StagingLabelListResponse> {
  const params: Record<string, string | number> = { page };
  if (status) params.status = status;
  const { data } = await apiClient.get('/staging/labels', { params });
  return stagingLabelListResponseSchema.parse(data);
}

export async function getStagingLabel(label: string): Promise<StagingLabelDetail> {
  const { data } = await apiClient.get(`/staging/labels/${label}`);
  return stagingLabelDetailSchema.parse(data);
}

export async function updateStagingLesson(lessonId: number, body: { title: string }): Promise<void> {
  await apiClient.patch(`/staging/lessons/${lessonId}`, body);
}

export async function updateStagingProblem(
  problemId: number,
  body: { instruction?: string; content?: string },
): Promise<void> {
  await apiClient.patch(`/staging/problems/${problemId}`, body);
}

export async function updateStagingOption(
  optionId: number,
  body: { content?: string; explanation?: string; isAnswer?: boolean },
): Promise<void> {
  await apiClient.patch(`/staging/options/${optionId}`, body);
}

export async function updateStagingAnswer(
  answerId: number,
  body: { content?: string; explanation?: string },
): Promise<void> {
  await apiClient.patch(`/staging/answers/${answerId}`, body);
}

/** promote는 prod INSERT를 일으키는 비가역 작업이므로 실제 실행은 사람에게 맡깁니다(03 §8-7). */
export async function promoteStagingLabel(label: string): Promise<void> {
  await apiClient.patch(`/staging/labels/${label}/status`, { status: 'COMPLETED' });
}
