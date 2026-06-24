import { Check, GitBranch, XCircle } from "lucide-react";
import { useMindStore } from "../hooks/use-mind-store";
import { categoryBorderColor, formatBadges, statusDotClass } from "../lib/badges";
import type { MindNode } from "../types";

interface Props {
  node: MindNode;
}

export function TaskCard({ node }: Props) {
  const { dispatch } = useMindStore();
  const isDone = node.status === "done" || node.completed;
  const { dueHtml, showHigh, showBadgeRow } = formatBadges(node);

  return (
    <div
      data-testid={`task-card-${node.id}`}
      data-node-id={node.id}
      className="flex flex-col gap-1.5 min-w-0"
    >
      <div className="flex items-start gap-2 min-w-0">
        <button
          type="button"
          data-testid={`task-check-${node.id}`}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ id: node.id, type: "TOGGLE_COMPLETE" });
          }}
          className="shrink-0"
        >
          {isDone ? (
            <Check className="text-indigo-500" size={18} />
          ) : (
            <XCircle
              className="text-slate-300 dark:text-slate-600 hover:text-indigo-500"
              size={18}
            />
          )}
        </button>
        <span
          className={`whitespace-pre-wrap break-words max-w-[240px] flex-1 text-sm font-medium ${isDone ? "line-through text-slate-400 dark:text-slate-500" : ""}`}
        >
          {node.text}
        </span>
        <button
          type="button"
          data-testid={`add-child-${node.id}`}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ modal: { kind: "edit-new", parentId: node.id }, type: "OPEN_MODAL" });
          }}
          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 w-6 h-6 rounded-md flex items-center justify-center transition shrink-0"
          title="子タスクを追加"
        >
          <GitBranch size={12} />
        </button>
      </div>
      <div className="flex items-center justify-between w-full pt-1.5">
        <div className="flex items-center gap-1.5">
          {showBadgeRow && (
            <>
              <span dangerouslySetInnerHTML={{ __html: dueHtml }} />
              {showHigh && (
                <span className="bg-rose-50 text-rose-500 dark:bg-rose-950/20 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  重要
                </span>
              )}
            </>
          )}
          <span
            data-testid={`status-dot-${node.id}`}
            className={`w-2 h-2 rounded-full ${statusDotClass(node.status)}`}
            title={`status: ${node.status}`}
          />
        </div>
      </div>
      <div
        className="w-full"
        style={{ borderTop: `1px solid ${categoryBorderColor(node.categoryColor)}` }}
      />
    </div>
  );
}
