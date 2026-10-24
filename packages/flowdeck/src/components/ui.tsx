import type {
  CardEffect,
  CardInstance,
  CardType,
  GameState,
  PersonalityWeights,
  TaskCard,
  TaskPenalty,
} from "../engine/types";
import { playerById, taskSum } from "../engine/metrics";
import { tokenDef } from "../data/tokens";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  FlaskConical,
  FolderKanban,
  Gem,
  Hammer,
  Inbox,
  Palette,
  Search,
  Star,
  Timer,
  UserRound,
  Wrench,
} from "lucide-react";

export const LANE_LABEL: Record<"open" | "inbox" | "wip" | "test" | "done", string> = {
  open: "Backlog",
  inbox: "Ready",
  wip: "In Progress",
  test: "Review",
  done: "Done",
};

export const LANE_HINT: Record<"open" | "inbox" | "wip" | "test" | "done", string> = {
  open: "未着手",
  inbox: "設計",
  wip: "開発（WIP）",
  test: "テスト",
  done: "完了",
};

const CARD_ICON = {
  design: Palette,
  dev: Wrench,
  test: FlaskConical,
  debt: AlertTriangle,
} as const;

export function CardTypeIcon({
  type,
  size = 12,
  className,
}: {
  type: CardType;
  size?: number;
  className?: string;
}) {
  const Icon = CARD_ICON[type];
  return <Icon size={size} className={className} aria-hidden="true" />;
}

const TRAIT_ICON = {
  focus: Gauge,
  greed: Gem,
  urgency: Timer,
} as const;

const TRAIT_DIRECTION: Record<keyof PersonalityWeights, (value: number) => string> = {
  focus: (value) => (value >= 0 ? "仕上げ" : "着手"),
  greed: (value) => (value >= 0 ? "得点" : "整理"),
  urgency: (value) => (value >= 0 ? "納期" : "長期"),
};

export function topTrait(weights: PersonalityWeights): keyof PersonalityWeights {
  return (Object.entries(weights) as [keyof PersonalityWeights, number][]).toSorted(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1]),
  )[0]![0];
}

export function TraitIcon({
  weights,
  size = 12,
  className,
}: {
  weights: PersonalityWeights;
  size?: number;
  className?: string;
}) {
  const Icon = TRAIT_ICON[topTrait(weights)];
  return <Icon size={size} className={className} aria-hidden="true" />;
}

export function PlayerIcon({
  player,
  size = 12,
  className,
}: {
  player: { isHuman: boolean; weights: PersonalityWeights };
  size?: number;
  className?: string;
}) {
  if (player.isHuman) {
    return <UserRound size={size} className={className} aria-hidden="true" />;
  }
  return <TraitIcon weights={player.weights} size={size} className={className} />;
}

export function traitSummary(weights: PersonalityWeights): string {
  return (
    (Object.entries(weights) as [keyof PersonalityWeights, number][])
      .toSorted((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .filter(([, value]) => Math.abs(value) >= 0.2)
      .slice(0, 2)
      .map(([key, value]) => TRAIT_DIRECTION[key](value))
      .join("・") || "中立"
  );
}

export function LevelStars({
  level,
  className = "",
  size = 9,
  showEmpty = true,
}: {
  level: number;
  className?: string;
  size?: number;
  showEmpty?: boolean;
}) {
  const safe = Math.max(0, Math.min(5, level));
  return (
    <span
      className={`inline-flex items-center gap-0 ${className}`}
      title={`レベル ${level}`}
      aria-label={`レベル ${level}`}
    >
      {Array.from({ length: showEmpty ? 5 : safe }, (_, index) => (
        <Star
          key={index}
          size={size}
          className={index < safe ? "fill-current" : "opacity-25"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

const CARD_BADGE: Record<CardType, string> = {
  design: "bg-violet-600 text-white",
  dev: "bg-blue-600 text-white",
  test: "bg-amber-600 text-white",
  debt: "bg-red-600 text-white",
};

export function CardTypeBadge({
  type,
  size = 9,
  className = "",
}: {
  type: CardType;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[2px] p-0.5 ${CARD_BADGE[type]} ${className}`}
      aria-hidden="true"
    >
      <CardTypeIcon type={type} size={size} />
    </span>
  );
}

export const CARD_LABEL: Record<CardType, string> = {
  design: "設計",
  dev: "開発",
  test: "テスト",
  debt: "負債",
};

export const CARD_STYLE: Record<CardType, string> = {
  design: "border-violet-500/50 bg-violet-500/15 text-(--ink)",
  dev: "border-blue-500/50 bg-blue-500/15 text-(--ink)",
  test: "border-amber-500/50 bg-amber-500/15 text-(--ink)",
  debt: "border-red-500/50 bg-red-500/15 text-(--ink)",
};

const LANE_ICON = {
  open: FolderKanban,
  inbox: Inbox,
  wip: Hammer,
  test: Search,
  done: CheckCircle2,
} as const;

export function LaneIcon({
  lane,
  size = 12,
  className,
}: {
  lane: "open" | "inbox" | "wip" | "test" | "done";
  size?: number;
  className?: string;
}) {
  const Icon = LANE_ICON[lane];
  return <Icon size={size} className={className} aria-hidden="true" />;
}

export const PLAYER_TONE: Record<
  string,
  { text: string; bg: string; border: string; dot: string }
> = {
  p1: {
    text: "text-(--terra)",
    bg: "bg-(--terra)/10",
    border: "border-(--terra)/50",
    dot: "bg-(--terra)",
  },
  p2: {
    text: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-500/10",
    border: "border-violet-400/50",
    dot: "bg-violet-500",
  },
  p3: {
    text: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-500/10",
    border: "border-blue-400/50",
    dot: "bg-blue-500",
  },
  p4: {
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-400/50",
    dot: "bg-amber-500",
  },
  p5: {
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500/10",
    border: "border-rose-400/50",
    dot: "bg-rose-500",
  },
  p6: {
    text: "text-teal-700 dark:text-teal-300",
    bg: "bg-teal-500/10",
    border: "border-teal-400/50",
    dot: "bg-teal-500",
  },
  p7: {
    text: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-400/50",
    dot: "bg-sky-500",
  },
  p8: {
    text: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-500/10",
    border: "border-indigo-400/50",
    dot: "bg-indigo-500",
  },
  p9: {
    text: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-500/10",
    border: "border-orange-400/50",
    dot: "bg-orange-500",
  },
  p10: {
    text: "text-lime-700 dark:text-lime-300",
    bg: "bg-lime-500/10",
    border: "border-lime-400/50",
    dot: "bg-lime-500",
  },
  p11: {
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-400/50",
    dot: "bg-fuchsia-500",
  },
  p12: {
    text: "text-cyan-700 dark:text-cyan-300",
    bg: "bg-cyan-500/10",
    border: "border-cyan-400/50",
    dot: "bg-cyan-500",
  },
};

export function isDebtCard(card: CardInstance): boolean {
  return card.type === "debt";
}

export function cardName(card: CardInstance): string {
  if (card.type === "debt") return "負債";
  return `${CARD_LABEL[card.type]}lv${card.level}`;
}

export function cardTitle(card: CardInstance): string {
  if (card.type === "debt") return "負債カード";
  return card.title ?? cardName(card);
}

export function penaltyLabel(penalty?: TaskPenalty): string | null {
  if (!penalty) return null;
  if (penalty.kind === "allPlayersDebt") return `全員に負債${penalty.amount}`;
  if (penalty.kind === "ownerDebt") return `担当者に負債${penalty.amount}`;
  if (penalty.kind === "teamScore") return `企業価値-${penalty.amount}`;
  if (penalty.kind === "discardHand") {
    return penalty.target === "all" ? "全員の手札を捨てる" : "担当者の手札を捨てる";
  }
  if (penalty.kind === "loseAction") {
    return penalty.target === "all"
      ? `全員は翌日アクション-${penalty.amount}`
      : `担当者は翌日アクション-${penalty.amount}`;
  }
  return `進行中タスクに納期+${penalty.amount}`;
}

export function effectLabel(effect?: CardEffect): string | null {
  if (!effect) return null;
  if (effect.kind === "draw") return `ドロー+${effect.amount}`;
  if (effect.kind === "action") return `アクション+${effect.amount}`;
  if (effect.kind === "boost") return `貢献+${effect.amount}`;
  if (effect.kind === "requirement") return `要件-${effect.amount}`;
  if (effect.kind === "deadline") return `納期+${effect.amount}`;
  if (effect.kind === "token") {
    return `${tokenDef(effect.token)?.short ?? effect.token}トークン+${effect.amount}`;
  }
  return `負債除去${effect.amount}`;
}

export function targetTypeForLane(task: TaskCard): "design" | "dev" | "test" | null {
  if (task.lane === "inbox") return "design";
  if (task.lane === "wip") return "dev";
  if (task.lane === "test") return "test";
  return null;
}

export function effectiveCardLevel(card: CardInstance, target: "design" | "dev" | "test"): number {
  if (card.type === "debt") return 0;
  const boost = card.effect?.kind === "boost" ? card.effect.amount : 0;
  if (target === "test") return card.type === "test" ? card.level + boost : 0;
  return (card.type === target ? card.level : 1) + boost;
}

export function canPlayCardOnTask(card: CardInstance, task: TaskCard): boolean {
  if (isDebtCard(card)) return false;
  const target = targetTypeForLane(task);
  if (!target) return false;
  if (target === "test") return card.type === "test";
  return true;
}

export function rewardLabel(task: TaskCard): string {
  const effect = effectLabel(task.reward.effect);
  return `報酬: ${CARD_LABEL[task.reward.type]}lv${task.reward.level}${
    effect ? ` / ${effect}` : ""
  }`;
}

export function requirementText(task: TaskCard, type: "design" | "dev" | "test"): string {
  const required = task.requirements[type];
  if (required <= 0) return "—";
  return `${taskSum(task, type)}/${required}`;
}

export function requirementMet(task: TaskCard, type: "design" | "dev" | "test"): boolean {
  return taskSum(task, type) >= task.requirements[type];
}

export function taskOwnerName(state: GameState, task: TaskCard): string {
  return task.ownerId ? `引: ${playerById(state, task.ownerId).name}` : "Backlog";
}

export function playerWipCount(state: GameState, playerId: string): number {
  return state.tasks.filter(
    (task) =>
      task.ownerId === playerId &&
      (task.lane === "inbox" || task.lane === "wip" || task.lane === "test"),
  ).length;
}

export function laneCount(state: GameState, playerId: string, lane: TaskCard["lane"]): number {
  return state.tasks.filter((task) => task.ownerId === playerId && task.lane === lane).length;
}

export function laneCountAll(state: GameState, lane: TaskCard["lane"]): number {
  return state.tasks.filter((task) => task.lane === lane).length;
}
