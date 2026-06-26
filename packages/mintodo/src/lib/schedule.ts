import type { MindNode } from "../types";
import { effectiveEstimate } from "./estimate";

export interface Schedule {
  id: string;
  start: Date;
  end: Date;
  depth: number;
  estimateH: number;
  isLeaf: boolean;
  plannedEstimateH?: number;
  plannedDue?: Date;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

/**
 * 階層スケジュール計算 (24h 連続, 土日区別なし):
 * - @start を持つノードはその日付を局所的な原点とし、子孫もその原点で配置
 * - @start を持たないノードは origin(default epoch)を起点とする
 * - @start を持つノードのスパンは兄弟のカーソルを進めない(独立配置)
 */
export function scheduleNodes(nodes: Record<string, MindNode>, origin?: Date): Schedule[] {
  const root = Object.values(nodes).find((n) => n.isRoot);
  if (!root) return [];
  const result: Schedule[] = [];

  const isLeaf = (id: string) => (nodes[id]?.children.length ?? 0) === 0;

  const defaultOrigin = origin === undefined ? new Date(0) : new Date(origin);

  function walk(
    id: string,
    depth: number,
    cursor: Date,
    ancestorCompleted = false,
  ): { start: Date; end: Date; nextCursor: Date } {
    const node = nodes[id];
    if (!node) return { start: cursor, end: cursor, nextCursor: cursor };

    const hasLocalOrigin = Boolean(node.startDate);
    const inputCursor = new Date(cursor);
    const originCursor = hasLocalOrigin ? new Date(`${node.startDate}T00:00:00`) : cursor;

    const isCompleted = node.completed || ancestorCompleted;

    if (isLeaf(id)) {
      const est = isCompleted ? 0 : effectiveEstimate(nodes, id);
      const start = new Date(originCursor);
      const end = addHours(start, est);
      result.push({
        id,
        start,
        end,
        depth,
        estimateH: est,
        isLeaf: true,
        plannedEstimateH: node.estimate ?? undefined,
        plannedDue: node.dueDate ? new Date(`${node.dueDate}T00:00:00`) : undefined,
      });
      const rawNextCursor = isCompleted ? inputCursor : new Date(end);
      return { start, end, nextCursor: hasLocalOrigin ? inputCursor : rawNextCursor };
    }

    let minStart: Date | null = null;
    let maxEnd: Date | null = null;
    let childCursor = new Date(originCursor);

    for (const cid of node.children) {
      const span = walk(cid, depth + 1, childCursor, isCompleted);
      childCursor = span.nextCursor;
      if (!minStart || span.start < minStart) minStart = span.start;
      if (!maxEnd || span.end > maxEnd) maxEnd = span.end;
    }
    const spanStart = minStart ?? originCursor;
    const spanEnd = maxEnd ?? originCursor;
    const computedH = (spanEnd.getTime() - spanStart.getTime()) / 3_600_000;
    result.push({
      id,
      start: spanStart,
      end: spanEnd,
      depth,
      estimateH: computedH,
      isLeaf: false,
      plannedEstimateH: node.estimate ?? undefined,
      plannedDue: node.dueDate ? new Date(`${node.dueDate}T00:00:00`) : undefined,
    });
    return {
      start: spanStart,
      end: spanEnd,
      nextCursor: hasLocalOrigin ? inputCursor : childCursor,
    };
  }

  walk(root.id, 0, new Date(defaultOrigin));
  return result;
}
