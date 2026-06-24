interface Props {
  isDone: boolean;
  onToggle: () => void;
  testId: string;
}

export function TaskCheckbox({ isDone, onToggle, testId }: Props) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={isDone}
      aria-label={isDone ? "Mark as not done" : "Mark as done"}
      className={
        isDone
          ? "w-3.5 h-3.5 rounded-[3px] bg-emerald-500 flex items-center justify-center text-white text-[10px] leading-none shrink-0"
          : "w-3.5 h-3.5 rounded-[3px] border-[1.5px] shrink-0"
      }
      style={isDone ? undefined : { borderColor: "var(--mid)" }}
    >
      {isDone ? "✓" : ""}
    </button>
  );
}
