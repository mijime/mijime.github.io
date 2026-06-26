import { ListOrdered, Trash2 } from "lucide-react";
import { useState } from "react";
import { useMindStore } from "../hooks/use-mind-store";
import { parentBreadcrumb } from "../lib/breadcrumb";

export function WorkLogModal() {
  const { state, dispatch } = useMindStore();
  const { modal } = state;
  if (modal?.kind !== "work-log") return null;
  const node = state.nodes[modal.nodeId];
  if (!node) return null;

  const breadcrumb = parentBreadcrumb(state.nodes, node.id);
  const entries = [...node.workLogs].toReversed();

  const [inputText, setInputText] = useState("");
  let counter = 0;

  function addEntry() {
    const text = inputText.trim();
    if (!text) return;
    const id = `wl-${Date.now()}-${counter++}`;
    dispatch({
      type: "ADD_WORK_LOG",
      nodeId: node.id,
      entry: { id, timestamp: Date.now(), text },
    });
    setInputText("");
  }

  return (
    <div
      data-testid="worklog-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dispatch({ modal: null, type: "OPEN_MODAL" });
      }}
    >
      <div
        className="w-full max-w-md rounded overflow-hidden"
        style={{ background: "var(--paper)", border: "1px solid var(--border)" }}
      >
        <div className="p-6">
          <h3
            className="text-lg mb-4 flex items-center gap-2 truncate"
            style={{ fontFamily: '"Crimson Pro", serif', fontWeight: 600, color: "var(--ink)" }}
            title={breadcrumb}
          >
            <ListOrdered size={18} style={{ color: "var(--terra)" }} />
            {breadcrumb}
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {entries.map((entry) => (
              <div
                key={entry.id}
                data-testid={`worklog-modal-entry-${entry.id}`}
                className="flex items-start gap-2 text-sm py-1 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <span
                  className="text-xs shrink-0"
                  style={{ color: "var(--mid)", minWidth: "70px" }}
                >
                  {new Date(entry.timestamp).toLocaleString("ja-JP", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="flex-1" style={{ color: "var(--ink)" }}>
                  {entry.text}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "DELETE_WORK_LOG",
                      nodeId: node.id,
                      entryId: entry.id,
                    })
                  }
                  className="text-slate-400 hover:text-red-500 p-1 shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              data-testid="worklog-modal-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addEntry();
              }}
              placeholder="作業内容を入力..."
              className="flex-1 px-3 py-2 rounded text-sm outline-none"
              style={{
                background: "var(--toolbar-bg)",
                border: "1px solid var(--border)",
                color: "var(--ink)",
              }}
            />
            <button
              type="button"
              data-testid="worklog-modal-add"
              onClick={addEntry}
              className="px-4 py-2 rounded text-sm font-semibold transition"
              style={{ background: "var(--terra)", color: "var(--paper)" }}
            >
              追加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
