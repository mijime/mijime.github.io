import type { Dispatch } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge, Button, SectionLabel } from "@mijime/theme/ui";
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
  open: "text-(--tone-sky)",
  inbox: "text-(--tone-violet)",
  wip: "text-(--tone-blue)",
  test: "text-(--tone-amber)",
  done: "text-(--tone-green)",
} as const;

function DoneSummary({ count, titles }: { count: number; titles: string[] }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-sm border border-(--success)/20 bg-(--success)/5 px-2 py-4 text-center"
      title={titles.length > 0 ? titles.join(" / ") : "完了タスクなし"}
    >
      <CheckCircle2 size={18} className="text-(--success)" />
      <span className="mt-1 text-[30px] font-semibold leading-none tabular-nums text-(--success)">
        {count}
      </span>
      <SectionLabel className="mt-1">Completed</SectionLabel>
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
    <article className="flow-card border-l-2 p-2" style={{ borderLeftColor: "var(--tone-blue)" }}>
      <div className="flex items-start gap-1">
        <h3 className="min-w-0 flex-1 text-[11px] font-semibold leading-snug">{task.title}</h3>
        {task.kind === "incident" && (
          <Badge tone="danger" className="shrink-0 font-bold tracking-wider">
            INC
          </Badge>
        )}
        <span className="shrink-0 rounded-sm border border-(--border) bg-(--surface) px-1 text-[11px] font-semibold tabular-nums text-(--accent)">
          +{task.score}
        </span>
      </div>

      {task.kind === "incident" && task.penalty && (
        <p className="mt-0.5 text-[8px] font-medium text-(--danger)">
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
            className="rounded-sm border border-(--border) bg-(--surface)/70 px-1 py-0.5 text-center"
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
          className="inline-flex items-center gap-0.5 rounded-sm border border-(--border) bg-(--surface) px-1 py-0.5 text-[8px] text-(--ink)"
          title={rewardLabel(task)}
        >
          {task.kind === "relic" ? (
            <span className="font-semibold text-(--accent)">RELIC 3択</span>
          ) : task.reward ? (
            <>
              <CardTypeBadge type={task.reward.type} size={7} />
              <LevelStars level={task.reward.level} className="text-[8px] text-(--accent)" />
              {task.reward.effect && (
                <span className="ml-0.5 text-[7px] text-(--mid)">
                  {effectLabel(task.reward.effect)}
                </span>
              )}
            </>
          ) : null}
        </span>
      </div>

      <Button
        variant="primary"
        size="sm"
        disabled={!canPull}
        onClick={() => dispatch({ type: "PULL_TASK", taskId: task.id })}
        title={blockedReason ?? "BacklogからReadyへ引き取る"}
        className="mt-1.5 w-full gap-1 uppercase tracking-[0.12em]"
      >
        Pull <ArrowRight size={9} />
      </Button>
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
      <div className="ui-panel mb-1.5 flex flex-wrap items-baseline justify-between gap-1 px-2.5 py-1.5">
        <div className="flex items-baseline gap-2">
          <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em]">
            <span className="inline-block h-1.5 w-1.5 bg-(--accent) shadow-[0_0_8px_var(--accent)]" />
            チームボード
          </h2>
          <span className="text-[10px] tabular-nums text-(--mid)">WIP {wip}</span>
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
                className={`flow-lane min-w-0 p-1.5 ${
                  isBottleneck ? "ring-1 ring-(--warning)/60" : ""
                }`}
              >
                <div className="mb-1 flex items-baseline justify-between gap-1">
                  <h3 className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                    <LaneIcon lane={lane} size={11} className={LANE_TONE[lane]} />
                    {LANE_LABEL[lane]}
                  </h3>
                  {lane !== "done" && (
                    <span className="text-[10px] tabular-nums text-(--mid)">{tasks.length}</span>
                  )}
                </div>

                {lane === "open" && (
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 rounded-sm border border-(--border) bg-(--surface)/60 px-1.5 py-1">
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
                      <p className="py-4 text-center text-[9px] text-(--mid)">—</p>
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
