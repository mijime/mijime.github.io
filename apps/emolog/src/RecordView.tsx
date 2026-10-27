import { useState, useRef, useEffect } from "react";
import { ChevronUp, Plus } from "lucide-react";
import { Button } from "@mijime/theme/ui";
import "emoji-picker-element";
import { extractTags } from "./tags";

// emoji-picker-element のカスタム要素を JSX で書けるようにする。
// react-jsx の JSX 名前空間は react 側にあるので、そこを拡張する（型は緩めで十分）。
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

const MAX_FAV = 12;

interface RecordViewProps {
  favorites: string[];
  onTap: (emoji: string, note?: string) => void;
}

export function RecordView({ favorites, onTap }: RecordViewProps) {
  const [note, setNote] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [_pickerEmoji, _setPickerEmoji] = useState<string | null>(null);
  const pickerRef = useRef<HTMLElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  const displayFavs = favorites.slice(0, MAX_FAV);
  const tags = extractTags(note);

  function handleTap(emoji: string) {
    const trimmed = note.trim();
    onTap(emoji, trimmed || undefined);
    setNote("");
    setShowPicker(false);
    if (noteInputRef.current) {
      noteInputRef.current.value = "";
    }
  }

  useEffect(() => {
    const el = pickerRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent;
      const emoji = detail.unicode || detail.emoji?.native || detail.emoji;
      if (emoji) {
        handleTap(emoji);
      }
    };
    el.addEventListener("emoji-click", handler);
    return () => el.removeEventListener("emoji-click", handler);
  }, [note, showPicker]);

  return (
    <div className="emolog-record">
      <div className="emolog-record-grid">
        {displayFavs.map((emoji) => (
          <button key={emoji} className="emolog-record-fav" onClick={() => handleTap(emoji)}>
            {emoji}
          </button>
        ))}
      </div>
      {favorites.length === 0 && (
        <p className="emolog-record-empty">よく使う絵文字はまだありません</p>
      )}

      <div className="emolog-record-picker-toggle">
        <Button
          variant="secondary"
          size="sm"
          className="emolog-record-toggle"
          onClick={() => setShowPicker((v) => !v)}
        >
          {showPicker ? (
            <>
              <ChevronUp size={14} /> 閉じる
            </>
          ) : (
            <>
              <Plus size={14} /> 絵文字を選ぶ
            </>
          )}
        </Button>
      </div>

      {showPicker && (
        <div className="emolog-record-picker-panel">
          <emoji-picker ref={pickerRef} class="emolog-record-picker-element" />
        </div>
      )}

      <div className="emolog-record-note">
        <input
          ref={noteInputRef}
          type="text"
          className="emolog-record-note-input"
          placeholder="いまの気持ちは？ #タグ"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={80}
        />
        {tags.length > 0 && (
          <div className="emolog-record-tags">
            {tags.map((tag) => (
              <span key={tag} className="emolog-tag">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
