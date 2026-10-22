import {
  CalendarDays,
  HelpCircle,
  LayoutGrid,
  RotateCcw,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { GameState } from "../engine/types";
import { DEBT_SCORE_PENALTY } from "../engine/types";

interface Props {
  state: GameState;
  onHelp: () => void;
  onNewGame: () => void;
}

function Stat({
  label,
  value,
  tone = "normal",
  icon,
  title,
}: {
  label: string;
  value: string;
  tone?: "normal" | "good" | "bad";
  icon?: React.ReactNode;
  title?: string;
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "bad"
        ? "text-red-600 dark:text-red-400"
        : "text-(--ink)";
  return (
    <span
      className="game-stat inline-flex items-center gap-1 rounded-sm border border-(--border) bg-(--paper) px-1.5 py-0.5"
      title={title}
    >
      {icon && <span className="text-(--mid)">{icon}</span>}
      <span className="text-[9px] text-(--mid)">{label}</span>
      <span className={`text-[11px] font-medium ${toneClass}`}>{value}</span>
    </span>
  );
}

export function Header({ state, onHelp, onNewGame }: Props) {
  const finalScore = state.teamScore - state.teamDebt * DEBT_SCORE_PENALTY;
  return (
    <header className="game-topbar sticky top-[52px] z-30 border-b border-(--border) bg-(--toolbar-bg)/95 backdrop-blur">
      <div className="mx-auto max-w-[1440px] px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-baseline gap-2">
            <h1 className="game-logo serif flex items-center gap-1.5 text-lg font-semibold tracking-wide sm:text-xl">
              <LayoutGrid size={18} className="text-(--terra)" /> Flowdeck
            </h1>
            <span className="hidden text-[9px] tracking-[0.2em] text-(--mid) sm:inline">
              CO-OP KANBAN DECKBUILDER
            </span>
          </div>

          <div className="flex min-w-[132px] items-center gap-1.5">
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-[9px] text-(--mid)">
              <CalendarDays size={10} /> Day{" "}
              <strong key={state.day} className="day-pop text-(--ink)">
                {state.day}
              </strong>{" "}
              / {state.totalDays}
            </span>
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-(--grid)">
              <span
                className="block h-full rounded-full bg-(--terra)"
                style={{ width: `${Math.min(100, (state.day / state.totalDays) * 100)}%` }}
              />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Stat
              icon={<TrendingUp size={11} />}
              label="企業価値"
              value={`${state.teamScore}`}
              tone="good"
            />
            <Stat
              icon={<Target size={11} />}
              label="見込み"
              value={`${finalScore}`}
              tone={
                finalScore >= state.rules.starThree
                  ? "good"
                  : finalScore >= state.rules.starOne
                    ? "normal"
                    : "bad"
              }
              title={`最終評価 = 企業価値 - 技術的負債 x ${DEBT_SCORE_PENALTY} - 期限切れ罰則`}
            />
            <Stat
              icon={<TrendingDown size={11} />}
              label="負債"
              value={`${state.teamDebt}/${state.rules.debtLimit}`}
              tone={state.teamDebt >= state.rules.debtLimit - 2 ? "bad" : "normal"}
            />
            <Stat icon={<Target size={11} />} label="目標" value={`${state.rules.starThree}`} />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={onHelp}
              className="inline-flex items-center gap-1 rounded-sm border border-(--border) bg-(--paper) px-2 py-1 text-[10px] text-(--mid) transition-colors hover:border-(--terra) hover:text-(--terra)"
            >
              <HelpCircle size={12} /> <span className="hidden sm:inline">遊び方</span>
            </button>
            <button
              type="button"
              onClick={onNewGame}
              className="inline-flex items-center gap-1 rounded-sm border border-(--border) bg-(--paper) px-2 py-1 text-[10px] text-(--mid) transition-colors hover:border-(--terra) hover:text-(--terra)"
            >
              <RotateCcw size={12} /> <span className="hidden sm:inline">新しいゲーム</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
