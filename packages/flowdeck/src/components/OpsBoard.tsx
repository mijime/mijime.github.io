import type { Dispatch } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Action, CardInstance, GameState, TaskCard } from "../engine/types";
import { CardPile } from "./CardPile";
import { DeadlinePip } from "./Token";
import { TaskCardView } from "./TaskCard";
import {
  CardTypeBadge,
  LANE_LABEL,
  LaneIcon,
  LevelStars,
  effectLabel,
  laneCountAll,
  penaltyLabel,
  rewardLabel,
} from "./ui";

interface Props {
  state: GameState;
  dispatch: Dispatch<Action>;
  selectedCard: CardInstance | null;
}

const LANES = ["open", "inbox", "wip", "test", "done"] as const;

const LANE_TONE = {
  open: "text-sky-300",
  inbox: "text-violet-300",
  wip: "text-sky-300",
  test: "text-amber-300",
  done: "text-emerald-300",
} as const;

function DoneSummary({ count, titles }: { count: number; titles: string[] }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-sm border border-emerald-500/20 bg-emerald-500/5 px-2 py-4 text-center"
      title={titles.length > 0 ? titles.join(" / ") : "完了タスクなし"}
    >
      <CheckCircle2 size={18} className="text-emerald-400" />
      <span className="mt-1 text-[30px] font-semibold leading-none tabular-nums text-emerald-300">
        {count}
      </span>
      <span className="mt-1 tac-label">Completed</span>
    </div>
  );
}

function BacklogCard({
  task,
  state,
  dispatch,
  canPull,
}: {
  task: TaskCard;
  state: GameState;
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
    <article className="tac-card p-2" style={{ borderLeftColor: "#38bdf8" }}>
      <div className="flex items-start gap-1">
        <h3 className="min-w-0 flex-1 text-[11px] font-semibold leading-snug">{task.title}</h3>
        {task.kind === "incident" && (
          <span className="shrink-0 rounded-sm border border-red-400/60 bg-red-500/15 px-1 text-[7px] font-bold tracking-wider text-red-300">
            INC
          </span>
        )}
        <span className="shrink-0 rounded-sm border border-(--tac-line) bg-(--tac-panel-2) px-1 text-[11px] font-semibold tabular-nums text-(--terra)">
          +{task.score}
        </span>
      </div>

      {task.kind === "incident" && task.penalty && (
        <p className="mt-0.5 text-[8px] font-medium text-red-300">
          期限切れ: {penaltyLabel(task.penalty)}
        </p>
      )}

      <div className="mt-1 grid grid-cols-3 gap-1">
        {(
          [
            ["design", task.requirements.design],
            ["dev", task.requirements.dev],
            ["test", task.requirements.test],
          ] as const
        ).map(([type, value]) => (
          <span
            key={type}
            className="rounded-sm border border-(--tac-line) bg-(--tac-panel-2)/70 px-1 py-0.5 text-center"
          >
            <CardTypeBadge type={type} size={7} className="mx-auto" />
            <span className="mt-0.5 block text-[11px] font-semibold tabular-nums text-(--ink)">
              {value}
            </span>
          </span>
        ))}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-1">
        <span className="inline-flex gap-0.5">
          {Array.from({ length: task.deadline }, (_, index) => (
            <DeadlinePip key={index} filled={index < task.tokens} />
          ))}
        </span>
        <span
          className="inline-flex items-center gap-0.5 rounded-sm border border-(--tac-line) bg-(--tac-panel-2) px-1 py-0.5 text-[8px] text-(--ink)"
          title={rewardLabel(task)}
        >
          <CardTypeBadge type={task.reward.type} size={7} />
          <LevelStars level={task.reward.level} className="text-[8px] text-(--terra)" />
          {task.reward.effect && (
            <span className="ml-0.5 text-[7px] text-(--tac-dim)">
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
        className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-sm bg-(--terra) px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#03110e] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
      >
        Pull <ArrowRight size={9} />
      </button>
    </article>
  );
}

export function OpsBoard({ state, dispatch, selectedCard }: Props) {
  const human = state.players.find((player) => player.isHuman);
  const canPull = state.phase === "human" && (human?.actionsLeft ?? 0) > 0;
  const activeLanes = (["inbox", "wip", "test"] as const).map((lane) => ({
    lane,
    count: laneCountAll(state, lane),
  }));
  const maxActive = Math.max(0, ...activeLanes.map((entry) => entry.count));
  const bottleneck = activeLanes.find((entry) => entry.count === maxActive)?.lane ?? null;
  const wip = activeLanes.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <section className="game-board min-w-0">
      <div className="tac-panel mb-1.5 flex flex-wrap items-baseline justify-between gap-1 px-2.5 py-1.5">
        <div className="flex items-baseline gap-2">
          <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em]">
            <span className="inline-block h-1.5 w-1.5 bg-(--terra) shadow-[0_0_8px_var(--terra)]" />
            チームボード
          </h2>
          <span className="text-[10px] tabular-nums text-(--tac-dim)">WIP {wip}</span>
        </div>
      </div>

      <div className="flow-scroll overflow-x-auto pb-2">
        <div className="grid min-w-[1120px] grid-cols-[0.85fr_1.15fr_1.3fr_1.15fr_0.45fr] items-start gap-1.5">
          {LANES.map((lane) => {
            const tasks = state.tasks.filter((task) => task.lane === lane);
            const isActive = lane === "inbox" || lane === "wip" || lane === "test";
            const isBottleneck = isActive && maxActive > 0 && lane === bottleneck;
            return (
              <div
                key={lane}
                data-lane={lane}
                title={isBottleneck ? "ボトルネック" : undefined}
                className={`tac-lane flow-lane min-w-0 p-1.5 ${
                  isBottleneck ? "ring-1 ring-amber-400/60" : ""
                }`}
              >
                <div className="mb-1 flex items-baseline justify-between gap-1">
                  <h3 className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                    <LaneIcon lane={lane} size={11} className={LANE_TONE[lane]} />
                    {LANE_LABEL[lane]}
                  </h3>
                  {lane !== "done" && (
                    <span className="text-[10px] tabular-nums text-(--tac-dim)">
                      {tasks.length}
                    </span>
                  )}
                </div>

                {lane === "open" && (
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 rounded-sm border border-(--tac-line) bg-(--tac-panel-2)/60 px-1.5 py-1">
                    <CardPile tone="deck" count={state.taskDeck.length} label="タスク山札" />
                    <CardPile tone="discard" count={state.taskDiscard.length} label="捨て札" />
                    <CardPile tone="risk" count={state.riskDeck.length} label="リスクカード" />
                  </div>
                )}

                {lane === "done" ? (
                  <DoneSummary count={tasks.length} titles={tasks.map((task) => task.title)} />
                ) : (
                  <div className="space-y-1.5">
                    {tasks.map((task) =>
                      lane === "open" ? (
                        <BacklogCard
                          key={task.id}
                          task={task}
                          state={state}
                          dispatch={dispatch}
                          canPull={canPull}
                        />
                      ) : (
                        <TaskCardView
                          key={task.id}
                          state={state}
                          task={task}
                          dispatch={dispatch}
                          selectedCard={selectedCard}
                        />
                      ),
                    )}
                    {tasks.length === 0 && (
                      <p className="py-4 text-center text-[9px] text-(--tac-dim)">—</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
