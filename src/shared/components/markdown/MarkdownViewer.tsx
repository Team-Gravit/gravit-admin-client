import { remarkPlugins } from '@/shared/lib/markdown';
import ReactMarkdown, { type Components } from 'react-markdown';

/** 대화 소실을 막기 위해 chat 링크는 새 탭으로 열고, 긴 코드·표는 블록 내부에서 스크롤합니다. */
const chatComponents: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  pre: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto">
      <pre {...props} />
    </div>
  ),
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  ),
};

interface MarkdownViewerProps {
  content: string;
  variant?: 'default' | 'chat';
}

export function MarkdownViewer({ content, variant = 'default' }: MarkdownViewerProps) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={variant === 'chat' ? chatComponents : undefined}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
