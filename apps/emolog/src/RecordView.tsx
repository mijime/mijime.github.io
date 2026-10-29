import { useState, useRef } from "react";
import { ChevronUp, Plus } from "lucide-react";
import { Button } from "@mijime/theme/ui";
import { EmojiPicker } from "./EmojiPicker";
import { extractTags } from "./tags";

const MAX_FAV = 12;

interface RecordViewProps {
  favorites: string[];
  onTap: (emoji: string, note?: string) => void;
}

export function RecordView({ favorites, onTap }: RecordViewProps) {
  const [note, setNote] = useState("");
  const [showPicker, setShowPicker] = useState(false);
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
          <EmojiPicker onSelect={handleTap} />
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
