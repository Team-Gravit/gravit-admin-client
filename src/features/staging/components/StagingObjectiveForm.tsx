import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { FormField } from '@/shared/components/form/FormField';
import { FieldError } from '@/shared/components/form/FieldError';
import { ProblemTypeBadge } from '@/shared/components/status-badge/ProblemTypeBadge';
import { MarkdownEditor } from '@/shared/components/markdown/MarkdownEditor';
import { buildObjectiveSaveTasks } from '@/features/staging/objectiveSaveTasks';
import { useStagingSave } from '@/features/staging/useStagingSave';
import {
  stagingObjectiveFormSchema,
  type StagingObjectiveProblem,
  type StagingObjectiveFormValues,
} from '@/features/staging/schemas';

const OPTION_MARKERS = ['①', '②', '③', '④'];

interface StagingObjectiveFormProps {
  problem: StagingObjectiveProblem;
  problemNumber: number;
  label: string;
  hidden?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  readOnly?: boolean;
}

export function StagingObjectiveForm({
  problem,
  problemNumber,
  label,
  hidden,
  onDirtyChange,
  readOnly,
}: StagingObjectiveFormProps) {
  const { isSaving, save } = useStagingSave(label);
  const originalAnswerOptionId = problem.options.find((option) => option.isAnswer)?.optionId ?? 0;

  const form = useForm<StagingObjectiveFormValues>({
    resolver: zodResolver(stagingObjectiveFormSchema),
    mode: 'onBlur',
    defaultValues: {
      instruction: problem.instruction,
      content: problem.content,
      answerOptionId: originalAnswerOptionId || (problem.options[0]?.optionId ?? 0),
      options: problem.options.map((option) => ({
        optionId: option.optionId,
        content: option.content,
        explanation: option.explanation,
      })),
    },
  });
  const {
    register,
    watch,
    setValue,
    formState: { errors, isDirty, dirtyFields },
  } = form;
  const { fields } = useFieldArray({ control: form.control, name: 'options' });
  const answerOptionId = watch('answerOptionId');

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const dirtyBorder = (dirty: boolean | undefined) =>
    dirty ? 'border-l-4 border-l-primary' : undefined;
  const roClass = readOnly ? 'bg-hover text-fg-secondary' : undefined;

  const onSubmit = form.handleSubmit(
    async (values) => {
      await save(
        buildObjectiveSaveTasks({
          problemId: problem.problemId,
          originalAnswerOptionId,
          values,
          dirtyFields,
          resetField: form.resetField,
        }),
      );
    },
    () => toast.error('필수 항목을 확인해 주세요.'),
  );

  return (
    <div className={cn('flex flex-col gap-5', hidden && 'hidden')}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-h3 text-foreground">문제 {problemNumber}</h3>
          <ProblemTypeBadge problemType={problem.problemType} />
        </div>
        <p className="text-caption tabular-nums text-fg-muted">ID: {problem.problemId}</p>
      </div>

      <FormField
        label="지시문"
        htmlFor={`obj-instruction-${problem.problemId}`}
        required
        error={errors.instruction?.message}
      >
        <Input
          id={`obj-instruction-${problem.problemId}`}
          className={cn(dirtyBorder(dirtyFields.instruction), roClass)}
          disabled={readOnly || isSaving}
          {...register('instruction')}
        />
      </FormField>
      <FormField
        label="본문"
        htmlFor={`obj-content-${problem.problemId}`}
        required
        error={errors.content?.message}
      >
        <MarkdownEditor
          id={`obj-content-${problem.problemId}`}
          className={cn('min-h-24', dirtyBorder(dirtyFields.content), roClass)}
          disabled={readOnly || isSaving}
          registration={register('content')}
          value={watch('content')}
        />
      </FormField>

      <div className="flex flex-col gap-3">
        <h4 className="text-body font-medium text-foreground">보기 (4개 고정)</h4>
        <RadioGroup
          value={String(answerOptionId)}
          onValueChange={(value) =>
            setValue('answerOptionId', Number(value), { shouldDirty: true })
          }
          disabled={readOnly || isSaving}
          className="gap-4"
        >
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex items-start gap-3 rounded-md border border-border p-4"
            >
              <span className="w-5 shrink-0 pt-2 text-body text-foreground">
                {OPTION_MARKERS[index]}
              </span>
              <label className="flex shrink-0 items-center gap-2 pt-2 text-caption text-fg-secondary">
                <RadioGroupItem value={String(field.optionId)} />
                정답
              </label>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <Input
                    className={cn(dirtyBorder(dirtyFields.options?.[index]?.content), roClass)}
                    disabled={readOnly || isSaving}
                    {...register(`options.${index}.content`)}
                  />
                  <FieldError message={errors.options?.[index]?.content?.message} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-caption text-fg-muted">해설</span>
                  <Textarea
                    className={cn(
                      'min-h-16',
                      dirtyBorder(dirtyFields.options?.[index]?.explanation),
                      roClass,
                    )}
                    disabled={readOnly || isSaving}
                    {...register(`options.${index}.explanation`)}
                  />
                  <FieldError message={errors.options?.[index]?.explanation?.message} />
                </div>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={!isDirty || isSaving}>
            {isSaving && (
              <Loader2
                className="animate-spin motion-reduce:animate-none"
                style={{ animationDuration: 'var(--motion-loading-cycle)' }}
                aria-hidden
              />
            )}
            {isSaving ? '저장하고 있어요…' : '저장하기'}
          </Button>
        </div>
      )}
    </div>
  );
}
