import type { Dispatch } from "react";
import { CheckCircle2 } from "lucide-react";
import type { Action, CardInstance, GameState } from "../engine/types";
import { FlowTrack, type FlowCounts } from "./FlowTrack";
import { TaskCardView } from "./TaskCard";
import { LANE_LABEL, PLAYER_TONE, LaneIcon, PlayerIcon, laneCountAll } from "./ui";

interface Props {
  state: GameState;
  dispatch: Dispatch<Action>;
  selectedCard: CardInstance | null;
}

export function TeamBoard({ state, dispatch, selectedCard }: Props) {
  const completed = state.tasks.filter((task) => task.lane === "done");
  const lanes = ["inbox", "wip", "test"] as const;
  const activeCounts = lanes.map((lane) => ({
    lane,
    count: state.tasks.filter((task) => task.lane === lane).length,
  }));
  const wipCount = activeCounts.reduce((sum, entry) => sum + entry.count, 0);
  const maxActive = Math.max(0, ...activeCounts.map((entry) => entry.count));
  const bottleneckLane = activeCounts.find((entry) => entry.count === maxActive)?.lane ?? null;
  const flowCounts: FlowCounts = {
    open: laneCountAll(state, "open"),
    inbox: laneCountAll(state, "inbox"),
    wip: laneCountAll(state, "wip"),
    test: laneCountAll(state, "test"),
    done: completed.length,
  };

  return (
    <section className="game-board min-w-0">
      <div className="board-plaque mb-1.5 flex flex-wrap items-baseline justify-between gap-1 rounded-sm px-2 py-1">
        <div className="flex items-baseline gap-2">
          <h2 className="serif text-[13px] font-semibold">チームボード</h2>
          <span className="text-[9px] text-(--mid)">
            完了 {completed.length} ・ WIP {wipCount}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[8px] text-(--mid)">
          {state.players.map((player) => (
            <span key={player.id} className="inline-flex items-center gap-0.5">
              <PlayerIcon
                player={player}
                size={11}
                className={PLAYER_TONE[player.id]?.text ?? "text-(--mid)"}
              />
              {player.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flow-scroll overflow-x-auto pb-2">
        <div className="min-w-[720px]">
          <FlowTrack counts={flowCounts} onFelt />
          <div className="mt-1 grid grid-cols-3 items-start gap-1.5">
            {lanes.map((lane) => {
              const tasks = state.tasks.filter((task) => task.lane === lane);
              const bottleneck = maxActive > 0 && lane === bottleneckLane;
              return (
                <div
                  key={lane}
                  data-lane={lane}
                  title={bottleneck ? "ボトルネック" : undefined}
                  className={`flow-lane min-w-0 rounded-sm p-1.5 ${
                    bottleneck ? "ring-1 ring-amber-400/60" : ""
                  }`}
                >
                  <div className="mb-1 flex items-baseline justify-between gap-1">
                    <h3 className="serif flex items-center gap-1 text-[11px] font-semibold">
                      <LaneIcon
                        lane={lane}
                        size={12}
                        className={
                          lane === "inbox"
                            ? "text-violet-600 dark:text-violet-300"
                            : lane === "wip"
                              ? "text-blue-600 dark:text-blue-300"
                              : "text-amber-600 dark:text-amber-300"
                        }
                      />
                      {LANE_LABEL[lane]}
                    </h3>
                    <span className="text-[9px] text-(--mid)">{laneCountAll(state, lane)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {tasks.map((task) => (
                      <TaskCardView
                        key={task.id}
                        state={state}
                        task={task}
                        dispatch={dispatch}
                        selectedCard={selectedCard}
                      />
                    ))}
                    {tasks.length === 0 && (
                      <p className="py-3 text-center text-[9px] text-(--mid)">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {completed.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1 rounded-sm border border-(--border) bg-(--paper) px-2 py-1 text-[8px] text-(--mid)">
          <CheckCircle2 size={10} className="text-emerald-600" />
          {completed.slice(-5).map((task) => (
            <span
              key={task.id}
              className="rounded-sm bg-emerald-500/10 px-1 text-emerald-700 dark:text-emerald-300"
            >
              {task.title}
              {task.ownerId && (
                <span
                  className={`ml-1 inline-block h-1 w-1 rounded-full ${PLAYER_TONE[task.ownerId]?.dot ?? ""}`}
                />
              )}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
