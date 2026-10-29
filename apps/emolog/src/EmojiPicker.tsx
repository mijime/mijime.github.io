import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import "emoji-picker-element";

// emoji-picker-element のカスタム要素を JSX で書けるようにする。
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "emoji-picker": {
        ref?: unknown;
        class?: string;
        [attribute: string]: unknown;
      };
    }
  }
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const el = pickerRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent;
      const emoji = detail.unicode || detail.emoji?.native || detail.emoji;
      if (emoji) onSelectRef.current(emoji);
    };
    el.addEventListener("emoji-click", handler);
    return () => el.removeEventListener("emoji-click", handler);
  }, []);

  return (
    <div className="emolog-emoji-picker">
      {onClose && (
        <div className="emolog-emoji-picker-header">
          <span>絵文字を選択</span>
          <button type="button" aria-label="絵文字ピッカーを閉じる" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
      )}
      <emoji-picker ref={pickerRef} class="emolog-emoji-picker-element" />
    </div>
  );
}
