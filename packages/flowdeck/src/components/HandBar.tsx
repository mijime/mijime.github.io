import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import { Hand, Shield, Trash2 } from "lucide-react";
import type { Action, CardInstance, GameState } from "../engine/types";
import { ACTIONS_PER_TURN } from "../engine/rules/balance";
import { CardPile } from "./CardPile";
import { ActionToken, LlmToken } from "./Token";
import {
  CARD_LABEL,
  CARD_STYLE,
  CardTypeBadge,
  LevelStars,
  cardName,
  cardTitle,
  effectDescription,
  effectLabel,
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
  const style = CARD_STYLE[card.type];
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      title={effectDescription(card.effect) ?? undefined}
      className={`relative flex h-[96px] w-[124px] shrink-0 snap-start flex-col rounded-sm border p-2.5 text-left shadow-sm transition-all ${style} ${
        selected ? "ring-2 ring-(--terra) ring-offset-1 ring-offset-(--paper)" : ""
      } ${disabled ? "opacity-60" : "hover:-translate-y-0.5"}`}
    >
      <span className="flex items-baseline justify-between gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-wide">
          {card.type === "debt" ? (
            "DEBT"
          ) : (
            <span className="inline-flex items-center gap-0.5">
              <CardTypeBadge type={card.type} size={9} /> {CARD_LABEL[card.type]}
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
            <LevelStars level={card.level} className="text-[11px]" showEmpty={false} />
          )}
        </span>
      </span>
      <span className="mt-1 line-clamp-2 text-[10px] font-medium leading-snug text-(--ink)">
        {cardTitle(card)}
      </span>
      {effectLabel(card.effect) && (
        <span className="mt-auto text-[8.5px] font-medium text-(--ink)/70">
          {effectLabel(card.effect)}
        </span>
      )}
    </button>
  );
}

export function HandBar({ state, dispatch, selectedCardId, onSelect }: Props) {
  const human = state.players.find((player) => player.isHuman) ?? state.players[0];
  const handScrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  const updateScroll = useCallback(() => {
    const element = handScrollRef.current;
    if (!element) return;
    setCanScroll({
      left: element.scrollLeft > 4,
      right: element.scrollLeft + element.clientWidth < element.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateScroll();
    window.addEventListener("resize", updateScroll);
    return () => window.removeEventListener("resize", updateScroll);
  }, [updateScroll, human?.hand.length]);

  if (!human) return null;
  const isHumanTurn = state.phase === "human";
  const selected = human.hand.find((card) => card.id === selectedCardId) ?? null;

  return (
    <footer className="flow-hand game-hand">
      <div className="mx-auto max-w-[1600px] px-3 py-2">
        <div className="flex flex-col gap-2 lg:flex-row">
          <div className="tac-panel hidden w-[220px] shrink-0 p-2 lg:block">
            <div className="flex items-center justify-between">
              <span className="tac-label">Selected</span>
              <span className="tac-label">{human.actionsLeft} AP</span>
            </div>
            {selected ? (
              <>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <CardTypeBadge type={selected.type} size={9} />
                  <span className="min-w-0 truncate text-[12px] font-semibold">
                    {cardTitle(selected)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[9px] text-(--tac-dim)">{cardName(selected)}</span>
                  {selected.type === "debt" ? (
                    <span className="text-[12px] font-bold text-red-300">!</span>
                  ) : (
                    <LevelStars
                      level={selected.level}
                      className="text-[10px] text-(--terra)"
                      showEmpty={false}
                    />
                  )}
                </div>
                {selected.type === "test" && (
                  <p className="mt-1 text-[9px] font-medium text-sky-300">Review専用・lvそのまま</p>
                )}
                {effectLabel(selected.effect) && (
                  <p className="mt-1 text-[9px] font-medium text-(--terra)">
                    {effectLabel(selected.effect)}
                  </p>
                )}
                <button
                  type="button"
                  disabled={!isHumanTurn || human.actionsLeft <= 0}
                  onClick={() => {
                    dispatch({ type: "DISCARD_CARD", cardId: selected.id });
                    onSelect(null);
                  }}
                  title="選択中のカードを1アクションでデッキから廃棄"
                  className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-sm border border-red-400/50 bg-red-500/10 px-2 py-1 text-[9px] font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Trash2 size={10} /> 廃棄
                </button>
              </>
            ) : (
              <>
                <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                  {(
                    [
                      ["design", "Ready"],
                      ["dev", "In Progress"],
                      ["test", "Review"],
                    ] as const
                  ).map(([type, lane]) => (
                    <div
                      key={type}
                      className="rounded-sm border border-(--tac-line) bg-(--tac-panel-2) px-1 py-1"
                    >
                      <CardTypeBadge type={type} size={7} className="mx-auto" />
                      <span className="mt-0.5 block text-[7px] text-(--tac-dim)">{lane}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[9px] text-(--tac-dim)">カードを選択</p>
              </>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-2 text-[10px] text-(--ink)/70">
                <span className="tac-label hidden sm:inline">Loadout</span>
                <Hand size={13} />
                <span className="font-semibold text-(--ink)" title="手札">
                  {human.hand.length}
                </span>
                <CardPile tone="deck" count={human.deck.length} label="山札" />
                <CardPile tone="discard" count={human.discard.length} label="捨て札" />
                <span
                  className="inline-flex items-center gap-1 rounded-sm border border-(--terra)/30 px-1 text-(--terra)"
                  title="LLMトークン"
                >
                  <LlmToken className="h-3.5 w-3.5" /> {human.tokens.mi ?? 0}
                </span>
                {(human.shields ?? 0) > 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded-sm border border-sky-400/30 px-1 text-sky-300"
                    title="シールド（次の負債を防ぐ）"
                  >
                    <Shield size={11} /> {human.shields}
                  </span>
                )}
              </div>
              <div
                className="flex items-center gap-1 text-[10px] text-(--ink)/70"
                title="残りアクション"
              >
                {Array.from(
                  { length: Math.max(ACTIONS_PER_TURN, human.actionsLeft) },
                  (_, index) => (
                    <ActionToken key={index} filled={index < human.actionsLeft} />
                  ),
                )}
                <span className="ml-1 text-[12px] font-semibold text-(--ink)">
                  {human.actionsLeft}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                {!isHumanTurn && (
                  <span className="flow-pulse rounded-sm border border-(--border) px-1.5 py-0.5 text-[9px] text-(--ink)/65">
                    {state.phase === "ai" ? "メンバーの手番" : "日末処理"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => dispatch({ type: "END_TURN" })}
                  disabled={!isHumanTurn}
                  title="残りのアクションを放棄して、この日はもう動かない"
                  className="rounded-sm bg-(--terra) px-3 py-1.5 text-[10px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  パス
                </button>
              </div>
            </div>

            <div className="mt-1 flex items-center gap-2 lg:hidden">
              <span className="min-w-0 truncate text-[10px] text-(--ink)">
                {selected ? cardTitle(selected) : "カードを選択"}
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
                className="ml-auto inline-flex items-center gap-1 rounded-sm border border-red-400/50 bg-red-500/10 px-2 py-0.5 text-[9px] font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Trash2 size={10} /> 廃棄
              </button>
            </div>

            <div className="mt-1 flex items-center gap-1.5 sm:hidden">
              <Hand size={11} className="text-(--terra)" />
              <span className="text-[9px] tracking-[0.1em] text-(--tac-dim)">手札</span>
              <span className="text-[12px] font-semibold tabular-nums text-(--ink)">
                {human.hand.length}
              </span>
              <span className="text-[9px] text-(--tac-dim)">枚</span>
              <span className="ml-1 flex items-center gap-0.5">
                {human.hand.map((card, index) => (
                  <span
                    key={card.id}
                    title={`${index + 1}: ${cardTitle(card)}`}
                    className={`h-2 w-3.5 rounded-[1px] border ${
                      card.id === selectedCardId
                        ? "border-(--terra) bg-(--terra)"
                        : "border-(--border) bg-(--tac-panel-2)"
                    }`}
                  />
                ))}
              </span>
              {canScroll.right && (
                <span
                  className="ml-auto text-[12px] leading-none text-(--terra)"
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </div>

            <div className="relative mt-1.5">
              {canScroll.left && (
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-7 bg-gradient-to-r from-(--paper) to-transparent" />
              )}
              {canScroll.right && (
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-8 items-center justify-end bg-gradient-to-l from-(--paper) via-(--paper)/80 to-transparent pr-0.5">
                  <span className="text-[16px] leading-none text-(--terra)">›</span>
                </div>
              )}
              <div
                ref={handScrollRef}
                onScroll={updateScroll}
                className="flow-scroll flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-0.5"
              >
                {human.hand.map((card) => (
                  <HandCard
                    key={card.id}
                    card={card}
                    selected={card.id === selectedCardId}
                    disabled={!isHumanTurn}
                    onSelect={() => onSelect(card.id === selectedCardId ? null : card.id)}
                  />
                ))}
                {human.hand.length === 0 && (
                  <p className="py-4 text-[9px] text-(--tac-dim)">手札なし</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
