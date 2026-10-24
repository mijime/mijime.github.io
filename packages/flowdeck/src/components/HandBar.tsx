import type { Dispatch } from "react";
import { Bot, Circle, CircleDot, Hand, Trash2 } from "lucide-react";
import type { Action, CardInstance, GameState } from "../engine/types";
import { ACTIONS_PER_TURN } from "../engine/types";
import {
  CARD_LABEL,
  CARD_STYLE,
  CardTypeIcon,
  LevelStars,
  cardTitle,
  effectLabel,
  isDebtCard,
} from "./ui";

interface Props {
  state: GameState;
  dispatch: Dispatch<Action>;
  selectedCardId: number | null;
  onSelect: (id: number | null) => void;
}

function HandCard({
  card,
  selected,
  disabled,
  onSelect,
}: {
  card: CardInstance;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const debt = isDebtCard(card);
  const style = CARD_STYLE[card.type];
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`relative flex h-[84px] w-[112px] shrink-0 flex-col rounded-sm border p-2 text-left shadow-sm transition-all ${style} ${
        selected ? "ring-2 ring-(--terra) ring-offset-1 ring-offset-(--paper)" : ""
      } ${disabled ? "opacity-50" : "hover:-translate-y-0.5"}`}
    >
      <span className="flex items-baseline justify-between gap-1">
        <span className="text-[8px] uppercase tracking-wider opacity-80">
          {card.type === "debt" ? (
            "DEBT"
          ) : (
            <span className="inline-flex items-center gap-0.5">
              <CardTypeIcon type={card.type} size={10} /> {CARD_LABEL[card.type]}
              {card.score !== undefined && (
                <span className="ml-0.5 font-semibold text-(--terra)">+{card.score}</span>
              )}
            </span>
          )}
        </span>
        <span className="text-[13px] font-semibold leading-none">
          {card.type === "debt" ? (
            "!"
          ) : (
            <LevelStars level={card.level} className="text-[10px]" showEmpty={false} />
          )}
        </span>
      </span>
      <span className="mt-1 line-clamp-2 text-[8px] leading-tight opacity-85">
        {cardTitle(card)}
      </span>
      {effectLabel(card.effect) && (
        <span className="mt-auto text-[7px] font-medium opacity-80">
          {effectLabel(card.effect)}
        </span>
      )}
      {debt && (
        <span className="mt-auto text-[7px] font-medium text-red-600 dark:text-red-300">
          負債カード
        </span>
      )}
    </button>
  );
}

export function HandBar({ state, dispatch, selectedCardId, onSelect }: Props) {
  const human = state.players.find((player) => player.isHuman) ?? state.players[0];
  if (!human) return null;
  const isHumanTurn = state.phase === "human";
  const selected = human.hand.find((card) => card.id === selectedCardId) ?? null;

  return (
    <footer className="flow-hand game-hand">
      <div className="mx-auto max-w-[1440px] px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-1.5 text-[9px] text-(--mid)">
            <Hand size={12} />
            <span className="font-medium text-(--ink)" title="手札">
              {human.hand.length}
            </span>
            <span title="山札">山{human.deck.length}</span>
            <span title="捨て札">捨{human.discard.length}</span>
            <span
              className="inline-flex items-center gap-0.5 rounded-sm border border-(--terra)/30 px-1 text-(--terra)"
              title="LLMトークン"
            >
              <Bot size={9} /> {human.tokens.mi ?? 0}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-(--mid)" title="残りアクション">
            {Array.from({ length: Math.max(ACTIONS_PER_TURN, human.actionsLeft) }, (_, index) => (
              <span
                key={index}
                className={index < human.actionsLeft ? "text-(--terra)" : "text-(--border)"}
              >
                {index < human.actionsLeft ? <CircleDot size={13} /> : <Circle size={13} />}
              </span>
            ))}
            <span className="ml-1 text-[11px] font-semibold text-(--ink)">{human.actionsLeft}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {!isHumanTurn && (
              <span className="flow-pulse rounded-sm border border-(--border) px-1.5 py-0.5 text-[8px] text-(--mid)">
                {state.phase === "ai" ? "メンバーの手番" : "日末処理"}
              </span>
            )}
            <button
              type="button"
              onClick={() => dispatch({ type: "END_TURN" })}
              disabled={!isHumanTurn}
              title="残りのアクションを放棄して、この日はもう動かない"
              className="rounded-sm bg-(--terra) px-3 py-1.5 text-[10px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
            >
              パス
            </button>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-sm border border-(--border)/70 bg-(--paper) px-2 py-1">
          <span className="text-[9px] text-(--mid)">
            {selected ? (
              <strong className="text-(--ink)">{cardTitle(selected)}</strong>
            ) : (
              "カードを選択"
            )}
          </span>
          <button
            type="button"
            disabled={!isHumanTurn || !selected || human.actionsLeft <= 0}
            onClick={() => {
              if (!selected) return;
              dispatch({ type: "DISCARD_CARD", cardId: selected.id });
              onSelect(null);
            }}
            title="選択中のカードを1アクションでデッキから廃棄"
            className="inline-flex items-center gap-1 rounded-sm border border-red-400/50 bg-red-500/10 px-2 py-0.5 text-[9px] font-medium text-red-700 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-35 dark:text-red-300"
          >
            <Trash2 size={11} /> 廃棄
          </button>
        </div>

        <div className="flow-scroll mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
          {human.hand.map((card) => (
            <HandCard
              key={card.id}
              card={card}
              selected={card.id === selectedCardId}
              disabled={!isHumanTurn}
              onSelect={() => onSelect(card.id === selectedCardId ? null : card.id)}
            />
          ))}
          {human.hand.length === 0 && <p className="py-4 text-[9px] text-(--mid)">手札なし</p>}
        </div>
      </div>
    </footer>
  );
}
