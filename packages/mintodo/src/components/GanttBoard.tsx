import { useMemo } from "react";
import { useMindStore } from "../hooks/use-mind-store";
import { effectiveEstimate } from "../lib/estimate";
import { scheduleNodes, type Schedule } from "../lib/schedule";
import type { MindNode } from "../types";

const PIXELS_PER_HOUR = 8;
const ROW_HEIGHT = 32;
const LEFT_COL_WIDTH = 280;
const ROW_PAD_X = 8;

function statusColorHex(s: MindNode["status"]): string {
  switch (s) {
    case "wip": {
      return "#0ea5e9";
    }
    case "review": {
      return "#f59e0b";
    }
    case "done": {
      return "#10b981";
    }
    default: {
      return "#94a3b8";
    }
  }
}

function dfs(nodes: Record<string, MindNode>, rootId: string): { node: MindNode; depth: number }[] {
  const out: { node: MindNode; depth: number }[] = [];
  const walk = (id: string, depth: number): void => {
    const node = nodes[id];
    if (!node) return;
    if (!node.isRoot) out.push({ node, depth });
    for (const cid of node.children) walk(cid, depth + 1);
  };
  walk(rootId, 0);
  return out;
}

function isCompletedSelfOrAncestor(nodes: Record<string, MindNode>, id: string): boolean {
  let cur = nodes[id];
  while (cur && !cur.isRoot) {
    if (cur.completed) return true;
    cur = nodes[cur.parentId!];
  }
  return false;
}

function isOverdue(end: Date, dueDate: string): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return end.getTime() > due.getTime();
}

function daysOverdue(end: Date, dueDate: string): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = end.getTime() - due.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const HOURS_PER_DAY = 8;

function toPxFromOrigin(date: Date, origin: Date): number {
  const realHours = (date.getTime() - origin.getTime()) / 3_600_000;
  const calDays = Math.floor(realHours / 24);
  const intraHours = realHours - calDays * 24;
  return calDays * HOURS_PER_DAY * PIXELS_PER_HOUR + intraHours * PIXELS_PER_HOUR;
}

function originOfNodes(nodes: Record<string, MindNode>): Date {
  let minDate: Date | null = null;
  for (const node of Object.values(nodes)) {
    if (node.startDate) {
      const d = new Date(`${node.startDate}T00:00:00`);
      if (!Number.isNaN(d.getTime()) && (!minDate || d < minDate)) {
        minDate = d;
      }
    }
  }
  if (minDate) return minDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function GanttBoard() {
  const { state } = useMindStore();
  const { nodes } = state;
  const root = Object.values(nodes).find((n) => n.isRoot);
  const originDate = useMemo(() => originOfNodes(nodes), [nodes]);
  const schedules = useMemo(() => {
    if (!root) return [];
    return scheduleNodes(nodes, originDate);
  }, [nodes, root, originDate]);
  const scheduleById = useMemo(() => {
    const m = new Map<string, Schedule>();
    for (const s of schedules) m.set(s.id, s);
    return m;
  }, [schedules]);
  const allRows = root ? dfs(nodes, root.id) : [];
  const rows = state.hideCompleted
    ? allRows.filter(({ node }) => !isCompletedSelfOrAncestor(nodes, node.id))
    : allRows;
  const lastSchedule = schedules.at(-1);
  const totalWidth = Math.max(lastSchedule ? toPxFromOrigin(lastSchedule.end, originDate) : 0, 320);

  const totalDays = Math.max(
    0,
    Math.ceil(
      (lastSchedule ? (lastSchedule.end.getTime() - originDate.getTime()) / 3_600_000 : 0) /
        HOURS_PER_DAY,
    ),
  );
  const dayStep = totalDays > 60 ? 30 : totalDays > 14 ? 7 : 1;
  const dateTicks: { dayOffset: number; label: string }[] = [];
  for (let d = 0; d <= totalDays; d += dayStep) {
    const date = new Date(originDate);
    date.setDate(date.getDate() + d);
    dateTicks.push({ dayOffset: d, label: `${date.getMonth() + 1}/${date.getDate()}` });
  }

  return (
    <div
      data-testid="gantt-board"
      className="w-full h-full overflow-auto"
      style={{ background: "var(--paper)" }}
    >
      <div className="flex" style={{ minWidth: LEFT_COL_WIDTH + totalWidth }}>
        <div
          className="sticky left-0 z-10 shrink-0"
          style={{
            width: LEFT_COL_WIDTH,
            background: "var(--paper)",
            borderRight: "1px solid var(--border)",
          }}
        >
          <div
            className="text-[10px] uppercase tracking-wider px-2 py-2"
            style={{
              color: "var(--mid)",
              height: ROW_HEIGHT,
              borderBottom: "1px solid var(--border)",
            }}
          >
            タスク
          </div>
          {rows.map(({ node, depth }) => {
            const sched = scheduleById.get(node.id);
            const est = effectiveEstimate(nodes, node.id);
            const isLeaf = node.children.length === 0;
            const leafOverdue = isLeaf && sched ? isOverdue(sched.end, node.dueDate) : false;
            const leafOd = isLeaf && sched ? daysOverdue(sched.end, node.dueDate) : 0;
            const nonLeafOverdue =
              !isLeaf && sched?.plannedDue ? isOverdue(sched.end, node.dueDate) : false;
            const nonLeafOd =
              !isLeaf && sched?.plannedDue ? daysOverdue(sched.end, node.dueDate) : 0;
            const overflow =
              !isLeaf && sched?.plannedEstimateH !== undefined
                ? sched.estimateH - sched.plannedEstimateH
                : 0;
            return (
              <div
                key={node.id}
                data-testid={`gantt-row-${node.id}`}
                className="flex items-center justify-between px-2 text-sm"
                style={{
                  height: ROW_HEIGHT,
                  paddingLeft: ROW_PAD_X + depth * 16,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span className="truncate flex-1" style={{ color: "var(--ink)" }}>
                  {node.text}
                </span>
                {sched && !isLeaf && (
                  <span
                    className="text-[10px] mr-2"
                    style={{ color: "var(--mid)" }}
                  >{`${Math.round(est)}h`}</span>
                )}
                {isLeaf && (
                  <span
                    className="text-[10px] mr-2"
                    style={{ color: "var(--mid)" }}
                  >{`${est}h`}</span>
                )}
                {leafOverdue && (
                  <span
                    className="text-[10px] px-1.5 rounded"
                    style={{ background: "rgba(244,63,94,0.15)", color: "#be123c" }}
                  >{`⚠ ${leafOd}日超過`}</span>
                )}
                {nonLeafOverdue && (
                  <span
                    className="text-[10px] px-1.5 rounded"
                    style={{ background: "rgba(244,63,94,0.15)", color: "#be123c" }}
                  >{`⚠ ${nonLeafOd}日超過`}</span>
                )}
                {overflow > 0 && (
                  <span
                    className="text-[10px] px-1.5 rounded"
                    style={{ background: "rgba(251,191,36,0.15)", color: "#92400e" }}
                  >{`⚠ ${Math.round(overflow)}h超過`}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="relative shrink-0" style={{ width: totalWidth }}>
          <div
            className="sticky top-0 z-10 flex"
            style={{
              height: ROW_HEIGHT,
              background: "var(--paper)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {dateTicks.map(({ dayOffset, label }) => {
              const left = dayOffset * HOURS_PER_DAY * PIXELS_PER_HOUR;
              return (
                <div
                  key={`tick-${dayOffset}`}
                  className="absolute top-0 bottom-0 flex items-center pl-1 text-[10px]"
                  style={{ left, color: "var(--mid)" }}
                >
                  {label}
                </div>
              );
            })}
          </div>
          {rows.map(({ node }) => {
            const sched = scheduleById.get(node.id);
            if (!sched) return null;
            const hourWidth = (sched.end.getTime() - sched.start.getTime()) / 3_600_000;
            const left = toPxFromOrigin(sched.start, originDate);
            const width = Math.max(hourWidth * PIXELS_PER_HOUR, 2);
            const isLeaf = node.children.length === 0;
            return (
              <div
                key={`bar-${node.id}`}
                data-testid={`gantt-bar-${node.id}`}
                className="relative"
                style={{
                  height: ROW_HEIGHT,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {isLeaf ? (
                  <div
                    data-testid={`gantt-bar-${node.id}-bar`}
                    style={{
                      position: "absolute",
                      top: 6,
                      left,
                      width,
                      height: ROW_HEIGHT - 12,
                      boxSizing: "border-box",
                      background: statusColorHex(node.status),
                      opacity: 0.7,
                      borderRadius: 4,
                      borderTop: `2px solid ${statusColorHex(node.status)}`,
                      borderBottom: `2px solid ${statusColorHex(node.status)}`,
                    }}
                  />
                ) : (
                  <div
                    data-testid={`gantt-bar-${node.id}-bar`}
                    style={{
                      position: "absolute",
                      top: 6,
                      left,
                      width,
                      height: ROW_HEIGHT - 12,
                      boxSizing: "border-box",
                      borderRadius: 4,
                      overflow: "hidden",
                      borderTop: `2px solid ${statusColorHex(node.status)}`,
                      borderBottom: `2px solid ${statusColorHex(node.status)}`,
                    }}
                  >
                    {node.children.map((cid) => {
                      const childSched = scheduleById.get(cid);
                      const childNode = nodes[cid];
                      if (!childSched || !childNode) return null;
                      const childHourWidth =
                        (childSched.end.getTime() - childSched.start.getTime()) / 3_600_000;
                      const childLeft = toPxFromOrigin(childSched.start, originDate);
                      const childWidth = Math.max(childHourWidth * PIXELS_PER_HOUR, 2);
                      return (
                        <div
                          key={cid}
                          data-testid={`gantt-bar-${node.id}-seg-${cid}`}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: childLeft - left,
                            width: childWidth,
                            height: "100%",
                            background: statusColorHex(childNode.status),
                            opacity: 0.7,
                            borderRadius: 2,
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: 2,
              background: "#ef4444",
            }}
          />
        </div>
      </div>
    </div>
  );
}
