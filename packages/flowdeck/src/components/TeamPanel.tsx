import { Hand, Layers, Users } from "lucide-react";
import type { GameState } from "../engine/types";
import { PLAYER_TONE, TraitIcon, traitSummary } from "./ui";

interface Props {
  state: GameState;
  aiTab: string;
  onSelectAi: (id: string) => void;
}

export function TeamPanel({ state, aiTab, onSelectAi }: Props) {
  const ais = state.players.filter((player) => !player.isHuman);
  const selected = ais.find((player) => player.id === aiTab) ?? ais[0];
  if (!selected) return null;

  const activeId =
    state.phase === "ai" ? (state.players[state.activePlayerIndex]?.id ?? null) : null;
  const isActive = activeId === selected.id;
  const tone = PLAYER_TONE[selected.id];

  return (
    <section className="rounded-sm border border-(--border) bg-(--paper) p-2">
      <div className="mb-1.5 flex items-baseline justify-between gap-1">
        <h2 className="serif flex items-center gap-1 text-[12px] font-semibold">
          <Users size={11} /> チーム
        </h2>
        <span className="text-[8px] text-(--mid)">{ais.length}人</span>
      </div>

      <div className="grid grid-cols-2 gap-1">
        {ais.map((player) => {
          const selectedTab = player.id === selected.id;
          const playerTone = PLAYER_TONE[player.id];
          return (
            <button
              key={player.id}
              type="button"
              onClick={() => onSelectAi(player.id)}
              className={`min-w-0 rounded-sm border px-1.5 py-1 text-left transition-colors ${
                selectedTab
                  ? `${playerTone?.border ?? "border-(--border)"} ${playerTone?.bg ?? ""}`
                  : "border-(--border) hover:border-(--terra)/50"
              } ${player.id === activeId ? "flow-pulse" : ""}`}
            >
              <span className="flex items-center gap-1.5">
                <TraitIcon
                  weights={player.weights}
                  size={14}
                  className={playerTone?.text ?? "text-(--mid)"}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[9px] font-medium">{player.name}</span>
                  <span className="block truncate text-[7px] text-(--mid)">
                    {traitSummary(player.weights)}
                  </span>
                </span>
              </span>
              <span className="mt-0.5 flex items-center justify-between text-[7px] text-(--mid)">
                <span>完了{player.completed}</span>
                <span>{player.score}pt</span>
                <span>{player.actionsLeft}手</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-(--border)/70 pt-1.5 text-[8px] text-(--mid)">
        <span className={`serif text-[11px] font-semibold ${tone?.text ?? ""}`}>
          <TraitIcon weights={selected.weights} size={12} className="mr-0.5 inline" />
          {selected.name}
        </span>
        <span className="rounded-sm border border-(--border) px-1 text-[7px]">
          {traitSummary(selected.weights)}
        </span>
        {isActive && <span className="text-(--terra)">手番中</span>}
        <span className="inline-flex items-center gap-0.5">
          <Hand size={8} /> {selected.hand.length}
        </span>
        <span className="inline-flex items-center gap-0.5">
          <Layers size={8} /> 山{selected.deck.length} / 捨{selected.discard.length}
        </span>
        <span>アクション {selected.actionsLeft}</span>
      </div>
    </section>
  );
}
