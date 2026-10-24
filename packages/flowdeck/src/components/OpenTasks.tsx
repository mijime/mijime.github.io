import type { Dispatch } from "react";
import { ArrowRight } from "lucide-react";
import type { Action, GameState, TaskCard } from "../engine/types";
import { CardPile } from "./CardPile";
import { DeadlinePip } from "./Token";
import { CardTypeBadge, LaneIcon, LevelStars, effectLabel, penaltyLabel, rewardLabel } from "./ui";

interface Props {
  state: GameState;
  dispatch: Dispatch<Action>;
}

function DeadlinePips({ task }: { task: TaskCard }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] text-(--ink)/65"
      title={`納期 ${task.tokens}/${task.deadline}`}
    >
      <span className="inline-flex gap-0.5">
        {Array.from({ length: task.deadline }, (_, index) => (
          <DeadlinePip key={index} filled={index < task.tokens} />
        ))}
      </span>
    </span>
  );
}

function OpenTaskCard({
  state,
  task,
  dispatch,
  canPull,
}: {
  state: GameState;
  task: TaskCard;
  dispatch: Dispatch<Action>;
  canPull: boolean;
}) {
  const human = state.players.find((player) => player.isHuman);
  const blockedReason =
    state.phase !== "human"
      ? "あなたの手番ではありません"
      : (human?.actionsLeft ?? 0) <= 0
        ? "アクションがありません"
        : null;

  return (
    <article className="flow-card flow-card-in flex min-w-[230px] max-w-[360px] flex-1 flex-col rounded-sm border-t-[3px] border-t-sky-500/60 p-2.5">
      <div className="flex items-start gap-1">
        <h3 className="min-w-0 flex-1 text-[12px] font-semibold leading-snug">{task.title}</h3>
        {task.kind === "incident" && (
          <span className="shrink-0 rounded-sm border border-red-400/60 bg-red-500/15 px-1 text-[8px] font-bold text-red-700 dark:text-red-300">
            INC
          </span>
        )}
        <span className="shrink-0 rounded-sm bg-(--terra)/10 px-1 text-[11px] font-semibold text-(--terra)">
          +{task.score}
        </span>
      </div>

      {task.kind === "incident" && task.penalty && (
        <p className="mt-0.5 text-[9px] font-medium text-red-600 dark:text-red-300">
          期限切れ: {penaltyLabel(task.penalty)}
        </p>
      )}

      <div className="mt-1 grid grid-cols-3 gap-1">
        {(
          [
            ["design", "設計", task.requirements.design],
            ["dev", "開発", task.requirements.dev],
            ["test", "テスト", task.requirements.test],
          ] as const
        ).map(([type, label, value]) => (
          <span
            key={type}
            className={`rounded-sm border px-1 py-1 ${
              type === "design"
                ? "border-violet-500/50 bg-violet-500/10"
                : type === "dev"
                  ? "border-blue-500/50 bg-blue-500/10"
                  : "border-amber-500/50 bg-amber-500/10"
            }`}
          >
            <span className="flex items-center gap-0.5 text-[8.5px] text-(--ink)/65">
              <CardTypeBadge type={type} size={8} /> {label}
            </span>
            <span className="block text-center text-[10px] font-semibold text-(--ink)">
              {value}
            </span>
          </span>
        ))}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-1">
        <DeadlinePips task={task} />
        <span
          className="inline-flex items-center gap-0.5 rounded-sm border border-emerald-500/50 bg-emerald-500/10 px-1 py-0.5 text-[9px] text-(--ink)"
          title={rewardLabel(task)}
        >
          <CardTypeBadge type={task.reward.type} size={8} />
          <LevelStars level={task.reward.level} className="text-[9px] text-(--terra)" />
          {task.reward.effect && (
            <span className="ml-0.5 text-[8px] font-medium text-(--ink)/70">
              {effectLabel(task.reward.effect)}
            </span>
          )}
        </span>
      </div>

      <button
        type="button"
        disabled={!canPull}
        onClick={() => dispatch({ type: "PULL_TASK", taskId: task.id })}
        title={blockedReason ?? "BacklogからReadyへ引き取る"}
        className="mt-1.5 inline-flex items-center justify-center gap-1 rounded-sm bg-(--terra) px-2 py-1.5 text-[10px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
      >
        Pull <ArrowRight size={11} />
      </button>
    </article>
  );
}

export function OpenTasks({ state, dispatch }: Props) {
  const open = state.tasks.filter((task) => task.lane === "open");
  const human = state.players.find((player) => player.isHuman);
  const canPull = state.phase === "human" && (human?.actionsLeft ?? 0) > 0;

  return (
    <section className="game-backlog mx-auto max-w-[1440px]">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-1 rounded-sm border border-(--border) bg-(--paper)/95 px-2 py-1 shadow-sm">
        <div className="flex items-baseline gap-2">
          <h2 className="serif flex items-center gap-1 text-[13px] font-semibold">
            <LaneIcon lane="open" size={12} className="text-sky-600 dark:text-sky-300" /> Backlog
          </h2>
          <span className="text-[9px] text-(--mid)">
            {open.length}/{state.rules.openTasks}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[9px] text-(--ink)/65">
          <CardPile tone="deck" count={state.taskDeck.length} label="タスク山札" />
          <CardPile tone="discard" count={state.taskDiscard.length} label="捨て札" />
          <CardPile tone="uncertainty" count={state.uncertaintyDeck.length} label="不確実カード" />
        </div>
      </div>
      <div className="flow-scroll mt-1 flex gap-2 overflow-x-auto pb-1">
        {open.map((task) => (
          <OpenTaskCard
            key={task.id}
            state={state}
            task={task}
            dispatch={dispatch}
            canPull={canPull}
          />
        ))}
        {open.length === 0 && <p className="py-4 text-[10px] text-(--mid)">—</p>}
      </div>
    </section>
  );
}
