import type { FormState, UseFormReturn } from 'react-hook-form';
import { updateStagingAnswer, updateStagingProblem } from '@/features/staging/api';
import type { StagingSubjectiveFormValues } from '@/features/staging/schemas';
import type { StagingSaveTask } from '@/features/staging/useStagingSave';

export function buildSubjectiveSaveTasks({
  problemId,
  answerId,
  values,
  dirtyFields,
  resetField,
}: {
  problemId: number;
  answerId: number;
  values: StagingSubjectiveFormValues;
  dirtyFields: FormState<StagingSubjectiveFormValues>['dirtyFields'];
  resetField: UseFormReturn<StagingSubjectiveFormValues>['resetField'];
}): StagingSaveTask[] {
  const tasks: StagingSaveTask[] = [];

  const problemBody: { instruction?: string; content?: string } = {};
  if (dirtyFields.instruction) problemBody.instruction = values.instruction;
  if (dirtyFields.content) problemBody.content = values.content;
  if (Object.keys(problemBody).length > 0) {
    tasks.push({
      run: () => updateStagingProblem(problemId, problemBody),
      commit: () => {
        if (problemBody.instruction !== undefined)
          resetField('instruction', { defaultValue: values.instruction });
        if (problemBody.content !== undefined)
          resetField('content', { defaultValue: values.content });
      },
    });
  }
  const answerBody: { content?: string; explanation?: string } = {};
  if (dirtyFields.answerContent) answerBody.content = values.answerContent;
  if (dirtyFields.answerExplanation) answerBody.explanation = values.answerExplanation;
  if (Object.keys(answerBody).length > 0) {
    tasks.push({
      run: () => updateStagingAnswer(answerId, answerBody),
      commit: () => {
        if (answerBody.content !== undefined)
          resetField('answerContent', { defaultValue: values.answerContent });
        if (answerBody.explanation !== undefined)
          resetField('answerExplanation', { defaultValue: values.answerExplanation });
      },
    });
  }

  return tasks;
}
