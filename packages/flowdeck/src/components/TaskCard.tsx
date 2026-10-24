import type { Dispatch } from "react";
import { Award, Lock } from "lucide-react";
import type { Action, CardInstance, GameState, TaskCard } from "../engine/types";
import { taskContributions, taskSum } from "../engine/metrics";
import { DeadlinePip, LlmToken } from "./Token";
import {
  CARD_LABEL,
  CardTypeBadge,
  LevelStars,
  CARD_STYLE,
  PLAYER_TONE,
  canPlayCardOnTask,
  cardName,
  effectiveCardLevel,
  effectLabel,
  PlayerIcon,
  penaltyLabel,
  rewardLabel,
  targetTypeForLane,
  taskOwnerName,
} from "./ui";

interface Props {
  state: GameState;
  task: TaskCard;
  dispatch: Dispatch<Action>;
  selectedCard: CardInstance | null;
  compact?: boolean;
}

function DeadlinePips({ task }: { task: TaskCard }) {
  const aging = task.tokens >= task.deadline - 1;
  return (
    <span
      className="inline-flex flex-wrap items-center gap-1 text-[9px] text-(--tac-dim)"
      title={`納期 ${task.tokens}/${task.deadline}`}
    >
      <span className="inline-flex gap-0.5">
        {Array.from({ length: task.deadline }, (_, index) => (
          <DeadlinePip key={index} filled={index < task.tokens} />
        ))}
      </span>
      <span className={aging ? "font-semibold text-red-300" : ""}>{task.tokens}日</span>
    </span>
  );
}

function Requirement({
  type,
  label,
  value,
  required,
  active,
}: {
  type: "design" | "dev" | "test";
  label: string;
  value: number;
  required: number;
  active: boolean;
}) {
  const met = required <= 0 || value >= required;
  const percent = required > 0 ? Math.min(100, (value / required) * 100) : 0;
  return (
    <span
      className={`rounded-sm border px-1 py-1 ${
        met
          ? "border-emerald-500/40 bg-emerald-500/5"
          : active
            ? "border-(--terra)/50 bg-(--terra)/5"
            : "border-(--tac-line) bg-(--tac-panel-2)/70"
      }`}
      title={`${label} ${value}/${required}`}
      aria-label={`${label} ${value}/${required}`}
    >
      <span className="flex items-center gap-1 text-[8px] uppercase tracking-[0.1em] text-(--tac-dim)">
        <CardTypeBadge type={type} size={7} /> {label}
      </span>
      <span
        className={`mt-0.5 block text-center text-[12px] font-semibold tabular-nums ${
          met ? "text-emerald-300" : "text-(--ink)"
        }`}
      >
        {required <= 0 ? "—" : `${value}/${required}`}
      </span>
      {required > 0 && (
        <span className="mt-1 block h-0.5 w-full overflow-hidden bg-(--border)">
          <span
            className={`block h-full ${
              met ? "bg-emerald-400" : active ? "bg-(--terra)" : "bg-(--tac-dim)"
            }`}
            style={{ width: `${percent}%` }}
          />
        </span>
      )}
    </span>
  );
}

export function TaskCardView({ state, task, dispatch, selectedCard, compact = false }: Props) {
  const target = targetTypeForLane(task);
  const canTarget = selectedCard !== null && canPlayCardOnTask(selectedCard, task);
  const owner = task.ownerId ? state.players.find((player) => player.id === task.ownerId) : null;
  const contributions = taskContributions(state, task);
  const contributionLeader = contributions[0];
  const contributionLeaderPlayer = contributionLeader
    ? state.players.find((player) => player.id === contributionLeader.playerId)
    : null;
  const isDone = task.lane === "done";
  const human = state.players.find((player) => player.isHuman);
  const canUseMi = state.phase === "human" && target !== null && (human?.tokens.mi ?? 0) > 0;
  const accent =
    target === "design"
      ? "#a78bfa"
      : target === "dev"
        ? "#38bdf8"
        : target === "test"
          ? "#fbbf24"
          : "var(--tac-accent)";

  return (
    <article
      onClick={() => {
        if (canTarget && selectedCard) {
          dispatch({ type: "PLAY_CARD", cardId: selectedCard.id, taskId: task.id });
        }
      }}
      className={`tac-card flow-card-in p-2 ${
        canTarget ? "cursor-pointer ring-2 ring-(--terra)/60" : ""
      }`}
      style={{ borderLeftColor: accent }}
      title={canTarget ? "選択中のカードを置く" : undefined}
    >
      <div className="flex items-start gap-1">
        <h3
          className={`min-w-0 flex-1 font-semibold leading-snug ${compact ? "text-[10px]" : "text-[12px]"}`}
        >
          {task.title}
        </h3>
        {task.kind === "incident" && (
          <span className="shrink-0 rounded-sm border border-red-400/60 bg-red-500/15 px-1 text-[8px] font-bold tracking-wider text-red-300">
            INC
          </span>
        )}
        {canUseMi && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              dispatch({ type: "USE_TOKEN", token: "mi", taskId: task.id });
            }}
            aria-label="LLMトークンを置く"
            title="LLMトークンをこのレーンにレベル1作業として置く（アクション消費なし）"
            className="inline-flex shrink-0 items-center justify-center rounded-sm border border-(--terra)/40 bg-(--terra)/10 p-0.5 text-(--terra) transition-colors hover:bg-(--terra)/20"
          >
            <LlmToken className="h-4 w-4" />
          </button>
        )}
        <span className="shrink-0 rounded-sm border border-(--tac-line) bg-(--tac-panel-2) px-1 text-[12px] font-semibold tabular-nums text-(--terra)">
          +{task.score}
        </span>
      </div>

      <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[9px] text-(--tac-dim)">
        {!compact && <span>{taskOwnerName(state, task)}</span>}
        {owner && compact && <span>{owner.name}</span>}
        {isDone && <span>Day {task.acquiredDay} 完了</span>}
        {task.expiredLane && <span className="font-medium text-red-300">期限切れ</span>}
      </div>

      {task.kind === "incident" && task.penalty && (
        <p className="mt-0.5 text-[9px] font-medium text-red-300">
          期限切れ: {penaltyLabel(task.penalty)}
        </p>
      )}

      <div className="mt-1 grid grid-cols-3 gap-1">
        <Requirement
          type="design"
          label="設計"
          value={taskSum(task, "design")}
          required={task.requirements.design}
          active={target === "design"}
        />
        <Requirement
          type="dev"
          label="開発"
          value={taskSum(task, "dev")}
          required={task.requirements.dev}
          active={target === "dev"}
        />
        <Requirement
          type="test"
          label="テスト"
          value={taskSum(task, "test")}
          required={task.requirements.test}
          active={target === "test"}
        />
      </div>

      {!compact && contributionLeader && (
        <p
          className="mt-1 flex flex-wrap items-center gap-1 text-[9px] text-(--tac-dim)"
          title={contributions
            .map(
              (contribution) =>
                `${contribution.playerName} ${contribution.points}pt/${contribution.cards}枚`,
            )
            .join(" / ")}
        >
          <Award size={9} className="text-(--terra)" />
          <span className="inline-flex items-center gap-0.5 font-semibold text-(--terra)">
            {contributionLeaderPlayer && <PlayerIcon player={contributionLeaderPlayer} size={9} />}
            {contributionLeader.playerName} {contributionLeader.points}pt
          </span>
          {contributions.length > 1 && <span>他{contributions.length - 1}人</span>}
        </p>
      )}

      {!compact && task.attached.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {task.attached.map((attached, index) => {
            const ownerPlayer = state.players.find((player) => player.id === attached.ownerId);
            const support = task.ownerId !== null && attached.ownerId !== task.ownerId;
            return (
              <span
                key={`${attached.card.id}-${index}`}
                title={`${attached.card.title ?? cardName({ ...attached.card, type: attached.playType, level: attached.playLevel })}${support ? ` / ${ownerPlayer?.name ?? ""}の支援` : ""}`}
                className={`inline-flex items-center gap-0.5 rounded-[2px] border px-1 py-0.5 text-[8.5px] font-medium ${CARD_STYLE[attached.playType]}`}
              >
                {CARD_LABEL[attached.playType]}
                {attached.playLevel}
                {support && ownerPlayer && (
                  <span
                    className={`ml-0.5 inline-block h-1.5 w-1.5 rounded-full ${PLAYER_TONE[attached.ownerId]?.dot ?? "bg-(--mid)"}`}
                  />
                )}
              </span>
            );
          })}
        </div>
      )}

      {compact && task.attached.length > 0 && (
        <p className="mt-0.5 text-[9px] text-(--tac-dim)">カード {task.attached.length}枚</p>
      )}

      <div className="mt-1 flex flex-wrap items-center justify-between gap-1">
        <DeadlinePips task={task} />
        <span
          className="inline-flex items-center gap-0.5 rounded-sm border border-(--tac-line) bg-(--tac-panel-2) px-1 py-0.5 text-[9px] text-(--ink)"
          title={rewardLabel(task)}
        >
          <CardTypeBadge type={task.reward.type} size={8} />
          <LevelStars level={task.reward.level} className="text-[9px] text-(--terra)" />
          {task.reward.effect && (
            <span className="ml-0.5 text-[8px] font-medium text-(--tac-dim)">
              {effectLabel(task.reward.effect)}
            </span>
          )}
        </span>
      </div>

      {canTarget && selectedCard && (
        <p className="mt-1 flex items-center gap-1 text-[9px] font-medium text-(--terra)">
          <Lock size={9} />
          {cardName(selectedCard)} → lv
          {effectiveCardLevel(selectedCard, target ?? "design")}
        </p>
      )}
    </article>
  );
}
