export function UserMessageItem({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-full whitespace-pre-wrap break-words rounded-lg bg-hover px-3 py-2 text-body text-foreground">
        {content}
      </p>
    </div>
  );
}
