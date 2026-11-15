/** 안내 시드는 재렌더에도 유지하고 추천 질문은 고정해 재진입 시 같은 질문을 찾게 합니다. */
const GREETINGS = ['Ravvit에게 물어보세요.', '무엇을 도와드릴까요?', '어떤 게 궁금하신가요?'];

const SUGGESTIONS = [
  '이번 스프린트 진행 중인 작업 알려줘',
  '마감이 다가오는 작업 알려줘',
  '저번 주 회의록 요약해줘',
];

interface EmptyPromptProps {
  nickname: string | null;
  seed: number;
  disabled: boolean;
  onPick: (question: string) => void;
}

export function EmptyPrompt({ nickname, seed, disabled, onPick }: EmptyPromptProps) {

  const candidates = nickname ? [...GREETINGS, `${nickname}님, 안녕하세요.`] : GREETINGS;
  const greeting = candidates[seed % candidates.length];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <p className="text-h2 text-foreground">{greeting}</p>

      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={disabled}
            // 자동 전송하지 않는다 — 사용자가 문장을 고쳐 보낼 수 있어야 한다
            onClick={() => onPick(suggestion)}
            className="rounded-md border border-border px-3 py-2 text-body text-fg-secondary hover:bg-hover disabled:text-fg-disabled disabled:hover:bg-transparent"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
