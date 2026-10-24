import {
  BookOpen,
  CalendarDays,
  HelpCircle,
  LayoutGrid,
  RotateCcw,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { GameState } from "../engine/types";
import { DEBT_SCORE_PENALTY } from "../engine/rules/balance";

interface Props {
  state: GameState;
  onHelp: () => void;
  onIntro: () => void;
  onNewGame: () => void;
  autoMode?: boolean;
  onStopAuto?: () => void;
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
    tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : "text-(--ink)";
  return (
    <span
      className="game-stat inline-flex items-center gap-1 rounded-sm border border-(--border) bg-(--paper) px-1.5 py-0.5"
      title={title}
    >
      {icon && <span className="text-(--tac-dim)">{icon}</span>}
      <span className="tac-label">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </span>
  );
}

function StarMeter({
  score,
  starOne,
  starTwo,
  starThree,
}: {
  score: number;
  starOne: number;
  starTwo: number;
  starThree: number;
}) {
  const max = Math.max(1, starThree);
  const percent = Math.min(100, Math.max(0, (score / max) * 100));
  return (
    <span
      className="game-stat inline-flex items-center gap-1 rounded-sm border border-(--border) bg-(--paper) px-1.5 py-0.5"
      title={`星1 ${starOne} / 星2 ${starTwo} / 星3 ${starThree}`}
    >
      <Star size={10} className="text-(--terra)" />
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-(--grid)">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${
            score >= starThree ? "bg-emerald-500" : "bg-(--terra)"
          }`}
          style={{ width: `${percent}%` }}
        />
        {[starOne, starTwo].map((threshold) => (
          <span
            key={threshold}
            className="absolute inset-y-0 w-px bg-(--paper)"
            style={{ left: `${(threshold / max) * 100}%` }}
          />
        ))}
      </span>
    </span>
  );
}

export function Header({ state, onHelp, onIntro, onNewGame, autoMode, onStopAuto }: Props) {
  const finalScore = state.teamScore - state.teamDebt * DEBT_SCORE_PENALTY;
  return (
    <header className="game-topbar sticky top-[52px] z-30 border-b border-(--border) bg-(--toolbar-bg)/95 backdrop-blur">
      <div className="mx-auto max-w-[1440px] px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="game-logo serif flex items-center gap-1.5 text-lg font-semibold tracking-wide sm:text-xl">
            <LayoutGrid size={18} className="text-(--terra)" /> Flowdeck
          </h1>

          <div className="flex min-w-[132px] items-center gap-2">
            <span className="inline-flex items-center gap-1 whitespace-nowrap tac-label">
              <CalendarDays size={10} /> Day{" "}
              <strong key={state.day} className="day-pop text-[12px] font-semibold text-(--ink)">
                {state.day}
              </strong>{" "}
              / {state.totalDays}
            </span>
            <span className="flex items-center gap-0.5" aria-hidden="true">
              {Array.from({ length: state.totalDays }, (_, index) => (
                <span
                  key={index}
                  className={`h-2.5 w-[3px] ${
                    index < state.day ? "bg-(--terra)" : "bg-(--border)"
                  }`}
                />
              ))}
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
              icon={<Star size={11} />}
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
            <StarMeter
              score={finalScore}
              starOne={state.rules.starOne}
              starTwo={state.rules.starTwo}
              starThree={state.rules.starThree}
            />
            <Stat
              icon={<TrendingDown size={11} />}
              label="負債"
              value={`${state.teamDebt}/${state.rules.debtLimit}`}
              tone={state.teamDebt >= state.rules.debtLimit - 2 ? "bad" : "normal"}
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {autoMode && (
              <span className="inline-flex items-center gap-1 rounded-sm border border-(--terra)/50 bg-(--terra)/10 px-1.5 py-0.5 text-[8px] font-medium text-(--terra)">
                AUTO
                <button
                  type="button"
                  onClick={onStopAuto}
                  className="rounded-sm border border-(--terra)/40 px-1 text-[7px] hover:bg-(--terra)/20"
                >
                  停止
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={onIntro}
              className="inline-flex items-center gap-1 rounded-sm border border-(--border) bg-(--paper) px-2 py-1 text-[10px] text-(--mid) transition-colors hover:border-(--terra) hover:text-(--terra)"
            >
              <BookOpen size={12} />{" "}
              <span className="hidden text-[9px] uppercase tracking-[0.12em] sm:inline">
                はじめに
              </span>
            </button>
            <button
              type="button"
              onClick={onHelp}
              className="inline-flex items-center gap-1 rounded-sm border border-(--border) bg-(--paper) px-2 py-1 text-[10px] text-(--mid) transition-colors hover:border-(--terra) hover:text-(--terra)"
            >
              <HelpCircle size={12} />{" "}
              <span className="hidden text-[9px] uppercase tracking-[0.12em] sm:inline">
                遊び方
              </span>
            </button>
            <button
              type="button"
              onClick={onNewGame}
              className="inline-flex items-center gap-1 rounded-sm border border-(--border) bg-(--paper) px-2 py-1 text-[10px] text-(--mid) transition-colors hover:border-(--terra) hover:text-(--terra)"
            >
              <RotateCcw size={12} />{" "}
              <span className="hidden text-[9px] uppercase tracking-[0.12em] sm:inline">
                新しいゲーム
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
