import { MousePointerClick } from "lucide-react";
import type { CardInstance, GameState } from "../engine/types";
import { PLAYER_TONE, PlayerIcon, cardName, cardTitle } from "./ui";

function hint(card: CardInstance | null): string {
  if (!card) return "カードを選ぶ / Backlog から Pull";
  if (card.type === "debt") return "廃棄するかパス";
  if (card.type === "test") return "Review へ";
  if (card.type === "design") return "Ready へ";
  return "In Progress へ";
}

export function TurnBanner({
  state,
  selectedCard,
}: {
  state: GameState;
  selectedCard: CardInstance | null;
}) {
  const active = state.players[state.activePlayerIndex];
  const isHuman = state.phase === "human";
  const isAi = state.phase === "ai";
  const awaiting = state.phase === "roundEnd";
  const tone = active ? PLAYER_TONE[active.id] : undefined;

  return (
    <section className="mx-auto mt-1.5 max-w-[1440px] px-2">
      <div
        className={`turn-banner flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border px-3 py-1.5 ${
          isHuman ? "border-(--accent)/50 bg-(--accent)/5" : "border-(--border) bg-(--paper)"
        }`}
      >
        <span
          className={`inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${
            isHuman ? "bg-(--accent) text-(--on-accent)" : "bg-(--grid) text-(--ink)"
          }`}
        >
          {active && (
            <PlayerIcon
              player={active}
              size={13}
              className={isHuman ? "text-(--on-accent)" : (tone?.text ?? "text-(--mid)")}
            />
          )}
          {isHuman
            ? "あなたの手番"
            : awaiting
              ? "日末処理"
              : active
                ? `${active.name}の手番`
                : "待機"}
        </span>

        <span className="min-w-0 flex-1 text-[10px] text-(--ink)/70">
          {isHuman ? (
            <>
              <MousePointerClick size={10} className="mr-1 inline" />
              {selectedCard ? (
                <>
                  <strong className="text-(--ink)">{cardTitle(selectedCard)}</strong>
                  <span className="ml-1">
                    {cardName(selectedCard)} → {hint(selectedCard)}
                  </span>
                </>
              ) : (
                hint(null)
              )}
            </>
          ) : isAi ? (
            "選択中…"
          ) : (
            "期限切れを処理中"
          )}
        </span>
      </div>
    </section>
  );
}
