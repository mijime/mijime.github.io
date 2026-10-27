import {
  BookOpen,
  CalendarDays,
  HelpCircle,
  RotateCcw,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge, Button, SectionLabel, StatChip, cx } from "@mijime/theme/ui";
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
  return (
    <StatChip
      label={label}
      value={value}
      icon={icon}
      tone={tone === "good" ? "good" : tone === "bad" ? "bad" : "neutral"}
      title={title}
    />
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
    <span className="ui-stat" title={`星1 ${starOne} / 星2 ${starTwo} / 星3 ${starThree}`}>
      <Star size={10} className="text-(--accent)" />
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-(--grid)">
        <span
          className={cx(
            "absolute inset-y-0 left-0 rounded-full",
            score >= starThree ? "bg-(--success)" : "bg-(--accent)",
          )}
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
          <div className="flex min-w-[132px] items-center gap-2">
            <SectionLabel className="inline-flex items-center gap-1 whitespace-nowrap">
              <CalendarDays size={10} /> Day{" "}
              <strong key={state.day} className="day-pop text-[12px] font-semibold text-(--ink)">
                {state.day}
              </strong>{" "}
              / {state.totalDays}
            </SectionLabel>
            {state.totalDays <= 30 ? (
              <span className="flex items-center gap-0.5" aria-hidden="true">
                {Array.from({ length: state.totalDays }, (_, index) => (
                  <span
                    key={index}
                    className={`h-2.5 w-[3px] ${
                      index < state.day ? "bg-(--accent)" : "bg-(--border)"
                    }`}
                  />
                ))}
              </span>
            ) : (
              <span
                className="relative h-2.5 w-16 overflow-hidden rounded-full bg-(--border)"
                aria-hidden="true"
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-(--accent)"
                  style={{ width: `${(state.day / state.totalDays) * 100}%` }}
                />
              </span>
            )}
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
              label="最終評価"
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
              label="技術的負債"
              value={`${state.teamDebt}/${state.rules.debtLimit}`}
              tone={state.teamDebt >= state.rules.debtLimit - 2 ? "bad" : "normal"}
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {autoMode && (
              <Badge tone="accent" className="gap-1">
                AUTO
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onStopAuto}
                  className="h-4 w-auto px-1 text-[7px] text-(--accent)"
                >
                  停止
                </Button>
              </Badge>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onIntro}
              className="gap-1 px-2 py-1 text-(--mid)"
            >
              <BookOpen size={12} />{" "}
              <SectionLabel className="hidden sm:inline">はじめに</SectionLabel>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onHelp}
              className="gap-1 px-2 py-1 text-(--mid)"
            >
              <HelpCircle size={12} />{" "}
              <SectionLabel className="hidden sm:inline">遊び方</SectionLabel>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onNewGame}
              className="gap-1 px-2 py-1 text-(--mid)"
            >
              <RotateCcw size={12} />{" "}
              <SectionLabel className="hidden sm:inline">新しいゲーム</SectionLabel>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
