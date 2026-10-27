import { Checkbox } from "@mijime/theme/ui";

interface Props {
  isDone: boolean;
  onToggle: () => void;
  testId: string;
}

export function TaskCheckbox({ isDone, onToggle, testId }: Props) {
  return (
    <Checkbox
      data-testid={testId}
      className="shrink-0"
      checked={isDone}
      aria-label={isDone ? "Mark as not done" : "Mark as done"}
      onClick={(e) => e.stopPropagation()}
      onChange={() => onToggle()}
    />
  );
}
