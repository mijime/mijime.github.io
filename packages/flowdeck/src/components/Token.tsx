import { Bot, Circle, CircleDot } from "lucide-react";

export function ActionToken({ filled, className = "" }: { filled: boolean; className?: string }) {
  const Icon = filled ? CircleDot : Circle;
  return (
    <Icon
      size={15}
      className={`${filled ? "text-(--terra)" : "text-(--tac-dim)"} ${className}`}
      aria-hidden="true"
    />
  );
}

export function LlmToken({ className = "" }: { className?: string }) {
  return <Bot size={16} className={`text-(--terra) ${className}`} aria-hidden="true" />;
}

export function DeadlinePip({ filled, className = "" }: { filled: boolean; className?: string }) {
  return (
    <Circle
      size={10}
      className={`${filled ? "fill-current text-(--terra)" : "text-(--tac-dim)"} ${className}`}
      aria-hidden="true"
    />
  );
}
