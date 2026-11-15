import type { FormState, UseFormReturn } from 'react-hook-form';
import { updateStagingOption, updateStagingProblem } from '@/features/staging/api';
import type { StagingObjectiveFormValues } from '@/features/staging/schemas';
import type { StagingSaveTask } from '@/features/staging/useStagingSave';

export function buildObjectiveSaveTasks({
  problemId,
  originalAnswerOptionId,
  values,
  dirtyFields,
  resetField,
}: {
  problemId: number;
  originalAnswerOptionId: number;
  values: StagingObjectiveFormValues;
  dirtyFields: FormState<StagingObjectiveFormValues>['dirtyFields'];
  resetField: UseFormReturn<StagingObjectiveFormValues>['resetField'];
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
  values.options.forEach((option, index) => {
    const optionBody: { content?: string; explanation?: string } = {};
    if (dirtyFields.options?.[index]?.content) optionBody.content = option.content;
    if (dirtyFields.options?.[index]?.explanation) optionBody.explanation = option.explanation;
    if (Object.keys(optionBody).length > 0) {
      tasks.push({
        run: () => updateStagingOption(option.optionId, optionBody),
        commit: () => {
          if (optionBody.content !== undefined)
            resetField(`options.${index}.content`, { defaultValue: option.content });
          if (optionBody.explanation !== undefined)
            resetField(`options.${index}.explanation`, {
              defaultValue: option.explanation,
            });
        },
      });
    }
  });
  if (dirtyFields.answerOptionId && values.answerOptionId !== originalAnswerOptionId) {
    const newAnswerOptionId = values.answerOptionId;
    tasks.push({
      run: () =>
        Promise.all([
          updateStagingOption(originalAnswerOptionId, { isAnswer: false }),
          updateStagingOption(newAnswerOptionId, { isAnswer: true }),
        ]),
      commit: () => resetField('answerOptionId', { defaultValue: newAnswerOptionId }),
    });
  }

  return tasks;
}
