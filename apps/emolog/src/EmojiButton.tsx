import { useEffect, useRef } from "react";

interface EmojiButtonProps {
  emoji: string;
  /** 絵文字ピッカーを開く */
  onEdit: () => void;
  onClick?: () => void;
  active?: boolean;
  editing?: boolean;
  title?: string;
}

const LONG_PRESS_MS = 500;
const MOVE_THRESHOLD = 10;

export function EmojiButton({
  emoji,
  onEdit,
  onClick,
  active = false,
  editing = false,
  title,
}: EmojiButtonProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => clearTimer, []);

  function handlePointerDown(e: React.PointerEvent<HTMLSpanElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    longPressRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY };
    clearTimer();
    timerRef.current = setTimeout(() => {
      longPressRef.current = true;
      onEdit();
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    const start = startRef.current;
    if (!start) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_THRESHOLD) {
      clearTimer();
      startRef.current = null;
    }
  }

  function handlePointerEnd() {
    clearTimer();
    startRef.current = null;
  }

  function handleClick() {
    // 長押しでピッカーを開いた直後のクリックは無視する
    if (longPressRef.current) {
      longPressRef.current = false;
      return;
    }
    if (editing) return;
    onClick?.();
  }

  function handleDoubleClick() {
    if (longPressRef.current) return;
    onEdit();
  }

  const classes = [
    "emolog-history-emoji",
    active ? "emolog-history-emoji-active" : "",
    editing ? "emolog-history-emoji-editing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes}
      title={title ?? "長押しまたはダブルクリックで絵文字を変更"}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {emoji}
    </span>
  );
}
