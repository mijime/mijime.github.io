import { useEffect } from "react";
import { useMindStore } from "./use-mind-store";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useKeyboard(): void {
  const { state, dispatch } = useMindStore();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (state.modal) {
          dispatch({ modal: null, type: "OPEN_MODAL" });
          e.preventDefault();
        }
        return;
      }
      if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "REDO" : "UNDO" });
        return;
      }

      if (state.modal) return;
      if (state.inlineEdit) return;
      if (isEditableTarget(e.target)) return;

      const active = state.nodes[state.selectedNodeId];
      if (!active) return;

      switch (e.key) {
        case "Tab": {
          e.preventDefault();
          dispatch({
            newId: crypto.randomUUID(),
            parentId: state.selectedNodeId,
            type: "ADD_CHILD_INLINE",
          });
          break;
        }
        case "Enter": {
          if (!active.isRoot && active.parentId) {
            e.preventDefault();
            dispatch({
              newId: crypto.randomUUID(),
              parentId: active.parentId,
              type: "ADD_CHILD_INLINE",
            });
          }
          break;
        }
        case "F2": {
          e.preventDefault();
          dispatch({ nodeId: state.selectedNodeId, type: "START_INLINE_EDIT" });
          break;
        }
        case " ": {
          if (!active.isRoot) {
            e.preventDefault();
            dispatch({ id: state.selectedNodeId, type: "TOGGLE_COMPLETE" });
          }
          break;
        }
        case "Delete":
        case "Backspace": {
          if (!active.isRoot) {
            e.preventDefault();
            dispatch({ id: state.selectedNodeId, type: "DELETE_NODE" });
          }
          break;
        }
        case "e":
        case "E": {
          if (!active.isRoot) {
            e.preventDefault();
            dispatch({ modal: { kind: "edit", nodeId: state.selectedNodeId }, type: "OPEN_MODAL" });
          }
          break;
        }
        case "c":
        case "C": {
          if (active.children.length > 0) {
            e.preventDefault();
            dispatch({ id: state.selectedNodeId, type: "TOGGLE_COLLAPSE" });
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          if (active.parentId) dispatch({ id: active.parentId, type: "SELECT" });
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          if (active.children.length > 0 && !active.collapsed) {
            dispatch({ id: active.children[0], type: "SELECT" });
          }
          break;
        }
        case "ArrowUp":
        case "ArrowDown": {
          e.preventDefault();
          if (active.isRoot || !active.parentId) break;
          const parent = state.nodes[active.parentId];
          if (!parent) break;
          const idx = parent.children.indexOf(state.selectedNodeId);
          const nextIdx = e.key === "ArrowUp" ? idx - 1 : idx + 1;
          if (nextIdx >= 0 && nextIdx < parent.children.length) {
            dispatch({ id: parent.children[nextIdx], type: "SELECT" });
          }
          break;
        }
        default: {
          break;
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, dispatch]);
}
