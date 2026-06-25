import { useMemo } from "react";
import { useMindStore } from "../hooks/use-mind-store";
import { categoryBorderColor, formatBadges } from "../lib/badges";
import { previousStatus } from "../lib/status-cycle";
import { countDescendants } from "../lib/tree";
import { DueBadge } from "./DueBadge";
import { StatusDot } from "./StatusDot";
import { TaskCheckbox } from "./TaskCheckbox";
import { priorityClass } from "./priority";
import type { MindNode } from "../types";

interface Props {
  node: MindNode;
}

export function TaskCard({ node }: Props) {
  const { dispatch, state } = useMindStore();
  const isDone = node.status === "done" || node.completed;
  const { due, statusLabel } = formatBadges(node);
  const hairlineColor = categoryBorderColor(node.categoryColor);
  const { total: childTotal, completed: childCompleted } = useMemo(
    () => countDescendants(state.nodes, node.id),
    [state.nodes, node.id],
  );

  const metaRow = isDone ? null : (
    <div className="flex items-center gap-1.5 min-w-0" style={{ minHeight: "18px" }}>
      <DueBadge due={due} />
      <span className="text-[9px] tracking-widest" style={{ color: "var(--mid)" }}>
        {statusLabel}
      </span>
      <span className="ml-auto">
        <StatusDot
          status={node.status}
          testId={`status-dot-button-${node.id}`}
          onClick={() =>
            dispatch({
              id: node.id,
              status: previousStatus(node.status),
              type: "SET_STATUS",
            })
          }
        />
      </span>
    </div>
  );

  const bodyRow = (
    <div className="flex items-start gap-2 min-w-0">
      <TaskCheckbox
        isDone={isDone}
        onToggle={() => dispatch({ id: node.id, type: "TOGGLE_COMPLETE" })}
        testId={`task-check-${node.id}`}
      />
      <span
        className={`whitespace-pre-wrap break-words max-w-[240px] flex-1 text-[15px] leading-[1.3] ${
          isDone ? "line-through" : ""
        } ${priorityClass(node.priority)}`}
        style={{
          fontFamily: '"Crimson Pro", serif',
          fontWeight: isDone ? 400 : undefined,
          color: isDone ? "var(--mid)" : "var(--ink)",
        }}
      >
        {node.text}
      </span>
      {isDone ? null : (
        <button
          type="button"
          data-testid={`add-child-${node.id}`}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ modal: { kind: "edit-new", parentId: node.id }, type: "OPEN_MODAL" });
          }}
          className="w-[18px] h-[18px] rounded text-[11px] font-semibold flex items-center justify-center shrink-0"
          style={{
            background: "color-mix(in srgb, var(--mid) 12%, transparent)",
            color: "var(--mid)",
          }}
          title="子タスクを追加"
        >
          +
        </button>
      )}
    </div>
  );

  return (
    <div
      data-testid={`task-card-${node.id}`}
      data-node-id={node.id}
      className="flex flex-col gap-1.5 min-w-0"
    >
      {isDone ? null : (
        <>
          {metaRow}
          <div className="w-full" style={{ borderTop: `1px solid ${hairlineColor}` }} />
        </>
      )}
      {bodyRow}
      {!isDone && childTotal > 0 ? (
        <div
          data-testid={`task-card-progress-${node.id}`}
          className="text-[10px] tracking-wider"
          style={{ color: "var(--mid)" }}
        >
          {childCompleted} / {childTotal}
        </div>
      ) : null}
      {isDone ? (
        <div
          className="w-full"
          style={{ borderTop: `1px solid ${hairlineColor}`, opacity: 0.35 }}
        />
      ) : null}
    </div>
  );
}
