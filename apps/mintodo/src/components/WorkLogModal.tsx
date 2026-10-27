import { ListOrdered, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, IconButton, Input, Modal } from "@mijime/theme/ui";
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
    <Modal
      open
      onClose={() => dispatch({ modal: null, type: "OPEN_MODAL" })}
      testId="worklog-modal"
      title={
        <span className="flex items-center gap-2 truncate" title={breadcrumb}>
          <ListOrdered size={18} className="shrink-0 text-(--accent)" />
          <span className="truncate">{breadcrumb}</span>
        </span>
      }
      size="md"
    >
      <div className="max-h-60 space-y-2 overflow-y-auto">
        {entries.map((entry) => (
          <div
            key={entry.id}
            data-testid={`worklog-modal-entry-${entry.id}`}
            className="flex items-start gap-2 border-b border-(--border) py-1 text-sm"
          >
            <span className="shrink-0 text-xs text-(--mid)" style={{ minWidth: "70px" }}>
              {new Date(entry.timestamp).toLocaleString("ja-JP", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="flex-1 text-(--ink)">{entry.text}</span>
            <IconButton
              label="削除"
              size="icon-sm"
              className="shrink-0 text-(--mid) hover:text-(--danger)"
              onClick={() =>
                dispatch({
                  type: "DELETE_WORK_LOG",
                  nodeId: node.id,
                  entryId: entry.id,
                })
              }
            >
              <Trash2 size={12} />
            </IconButton>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Input
          data-testid="worklog-modal-input"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addEntry();
          }}
          placeholder="作業内容を入力..."
          className="flex-1"
        />
        <Button variant="primary" size="sm" data-testid="worklog-modal-add" onClick={addEntry}>
          追加
        </Button>
      </div>
    </Modal>
  );
}
