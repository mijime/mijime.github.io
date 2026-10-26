import { Layers, Users } from "lucide-react";
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
    <section className="ui-panel p-2">
      <div className="mb-1.5 flex items-baseline justify-between gap-1">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em]">
          <Users size={11} className="text-(--accent)" /> チーム
        </h2>
        <span className="text-[9px] tabular-nums text-(--mid)">{ais.length}人</span>
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
              title={`${player.name} / ${traitSummary(player.weights)} / 完了${player.completed} / ${player.score}pt / 手${player.hand.length} / 山${player.deck.length} / 捨${player.discard.length}`}
              className={`min-w-0 flex items-center gap-1 rounded-sm border px-1.5 py-1 text-left transition-colors ${
                selectedTab
                  ? `${playerTone?.border ?? "border-(--border)"} ${playerTone?.bg ?? ""}`
                  : "border-(--border) bg-(--surface) hover:border-(--accent)/50"
              }`}
            >
              <TraitIcon
                weights={player.weights}
                size={12}
                className={playerTone?.text ?? "text-(--mid)"}
              />
              <span className="min-w-0 flex-1 truncate text-[10px] font-semibold">
                {player.name}
              </span>
              {player.id === activeId && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent) shadow-[0_0_6px_var(--accent)]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 border-t border-(--border) pt-1.5">
        <div className="flex items-center gap-1">
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${tone?.text ?? ""}`}
          >
            <TraitIcon weights={selected.weights} size={10} />
            {selected.name}
          </span>
          {isActive && <span className="text-[8px] font-medium text-(--accent)">手番中</span>}
          <span className="ml-auto text-[8px] tabular-nums text-(--mid)">
            完{selected.completed} / {selected.score}pt
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[8px] text-(--mid)">
          <span className="flex shrink-0 gap-0.5" title={`残りアクション ${selected.actionsLeft}`}>
            {Array.from({ length: 3 }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 w-1.5 ${index < selected.actionsLeft ? "bg-(--accent)" : "bg-(--border)"}`}
              />
            ))}
          </span>
          <span className="min-w-0 truncate">{traitSummary(selected.weights)}</span>
          <span className="ml-auto shrink-0 inline-flex items-center gap-0.5">
            <Layers size={8} /> 手{selected.hand.length} 山{selected.deck.length} 捨
            {selected.discard.length}
          </span>
        </div>
      </div>
    </section>
  );
}
