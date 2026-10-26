import type {
  CardInstance,
  CardType,
  GameState,
  PersonalityWeights,
  TaskCard,
} from "../engine/types";
import { playerById, taskSum } from "../engine/metrics";
import { effectDescription, effectLabel } from "../engine/rules/effects";
import { effectivePlayLevel, phaseForLane } from "../engine/rules/lanes";
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
  inbox: "Ready（設計）",
  wip: "In Progress（開発）",
  test: "Review（テスト）",
  done: "Done（完了）",
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
  greed: (value) => (value >= 0 ? "報酬" : "整理"),
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
  design: "border-(--tone-violet)/40 bg-(--tone-violet)/15 text-(--tone-violet)",
  dev: "border-(--tone-blue)/40 bg-(--tone-blue)/15 text-(--tone-blue)",
  test: "border-(--tone-amber)/40 bg-(--tone-amber)/15 text-(--tone-amber)",
  debt: "border-(--danger)/40 bg-(--danger)/15 text-(--danger)",
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
  design: "border-(--tone-violet)/45 bg-(--tone-violet)/10 text-(--ink)",
  dev: "border-(--tone-blue)/45 bg-(--tone-blue)/10 text-(--ink)",
  test: "border-(--tone-amber)/45 bg-(--tone-amber)/10 text-(--ink)",
  debt: "border-(--danger)/45 bg-(--danger)/10 text-(--ink)",
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
    text: "text-(--accent)",
    bg: "bg-(--accent)/10",
    border: "border-(--accent)/50",
    dot: "bg-(--accent)",
  },
  p2: {
    text: "text-(--tone-violet)",
    bg: "bg-(--tone-violet)/10",
    border: "border-(--tone-violet)/50",
    dot: "bg-(--tone-violet)",
  },
  p3: {
    text: "text-(--tone-blue)",
    bg: "bg-(--tone-blue)/10",
    border: "border-(--tone-blue)/50",
    dot: "bg-(--tone-blue)",
  },
  p4: {
    text: "text-(--tone-amber)",
    bg: "bg-(--tone-amber)/10",
    border: "border-(--tone-amber)/50",
    dot: "bg-(--tone-amber)",
  },
  p5: {
    text: "text-(--tone-rose)",
    bg: "bg-(--tone-rose)/10",
    border: "border-(--tone-rose)/50",
    dot: "bg-(--tone-rose)",
  },
  p6: {
    text: "text-(--tone-teal)",
    bg: "bg-(--tone-teal)/10",
    border: "border-(--tone-teal)/50",
    dot: "bg-(--tone-teal)",
  },
  p7: {
    text: "text-(--tone-sky)",
    bg: "bg-(--tone-sky)/10",
    border: "border-(--tone-sky)/50",
    dot: "bg-(--tone-sky)",
  },
  p8: {
    text: "text-(--tone-indigo)",
    bg: "bg-(--tone-indigo)/10",
    border: "border-(--tone-indigo)/50",
    dot: "bg-(--tone-indigo)",
  },
  p9: {
    text: "text-(--tone-orange)",
    bg: "bg-(--tone-orange)/10",
    border: "border-(--tone-orange)/50",
    dot: "bg-(--tone-orange)",
  },
  p10: {
    text: "text-(--tone-lime)",
    bg: "bg-(--tone-lime)/10",
    border: "border-(--tone-lime)/50",
    dot: "bg-(--tone-lime)",
  },
  p11: {
    text: "text-(--tone-fuchsia)",
    bg: "bg-(--tone-fuchsia)/10",
    border: "border-(--tone-fuchsia)/50",
    dot: "bg-(--tone-fuchsia)",
  },
  p12: {
    text: "text-(--tone-cyan)",
    bg: "bg-(--tone-cyan)/10",
    border: "border-(--tone-cyan)/50",
    dot: "bg-(--tone-cyan)",
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

export { effectDescription, effectLabel } from "../engine/rules/effects";
export { penaltyLabel } from "../engine/rules/penalties";

export function targetTypeForLane(task: TaskCard): "design" | "dev" | "test" | null {
  return phaseForLane(task.lane);
}

export function effectiveCardLevel(card: CardInstance, target: "design" | "dev" | "test"): number {
  return effectivePlayLevel(card, target);
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
  const description = effectDescription(task.reward.effect);
  return `報酬: ${CARD_LABEL[task.reward.type]}lv${task.reward.level}${
    effect ? ` / ${effect}${description ? `（${description}）` : ""}` : ""
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
