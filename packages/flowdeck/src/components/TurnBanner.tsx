import { MousePointerClick } from "lucide-react";
import type { CardInstance, GameState } from "../engine/types";
import { PLAYER_TONE, PlayerIcon, cardName, cardTitle, traitSummary } from "./ui";

function hint(card: CardInstance | null): string {
  if (!card) return "手札を選ぶか、Backlogからタスクを引き取る";
  if (card.type === "debt")
    return "負債カードはプレイできません。廃棄するか、パスで手札ごと捨てます。";
  if (card.type === "test") return "Reviewのタスクに置ける。Ready/In Progressにはlv1代用";
  if (card.type === "design") return "Readyにフル、In Progressにlv1代用で置ける";
  return "In Progressにフル、Readyにlv1代用で置ける";
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
  const traits = active ? traitSummary(active.weights) : null;

  return (
    <section className="mx-auto mt-1.5 max-w-[1440px] px-2">
      <div
        className={`turn-banner flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border px-3 py-1.5 ${
          isHuman ? "border-(--terra)/50 bg-(--terra)/5" : "border-(--border) bg-(--paper)"
        }`}
      >
        <span
          className={`inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${
            isHuman ? "bg-(--terra) text-white" : "bg-(--grid) text-(--ink)"
          }`}
        >
          {active && (
            <PlayerIcon
              player={active}
              size={13}
              className={isHuman ? "text-white" : (tone?.text ?? "text-(--mid)")}
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

        {traits && <span className={`text-[9px] ${tone?.text ?? "text-(--mid)"}`}>{traits}</span>}

        <span className="min-w-0 flex-1 text-[9px] text-(--mid)">
          {isHuman ? (
            <>
              <MousePointerClick size={10} className="mr-1 inline" />
              {selectedCard ? (
                <>
                  <strong className="text-(--ink)">
                    {cardTitle(selectedCard)}（{cardName(selectedCard)}）
                  </strong>
                  <span className="ml-1">{hint(selectedCard)}</span>
                </>
              ) : (
                hint(null)
              )}
            </>
          ) : isAi ? (
            "メンバーがカードとタスクを選んでいます…"
          ) : (
            "納期トークンと期限切れを処理しています"
          )}
        </span>

        {!isHuman && !awaiting && active && (
          <span className="text-[8px] text-(--mid)">
            手札 {active.hand.length} / 山 {active.deck.length}
          </span>
        )}
      </div>
    </section>
  );
}
