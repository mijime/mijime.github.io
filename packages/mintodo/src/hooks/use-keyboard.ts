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
      if (state.modal) return;
      if (isEditableTarget(e.target)) return;

      const active = state.nodes[state.selectedNodeId];
      if (!active) return;

      switch (e.key) {
        case "Tab": {
          e.preventDefault();
          dispatch({
            modal: { kind: "edit-new", parentId: state.selectedNodeId },
            type: "OPEN_MODAL",
          });
          break;
        }
        case "Enter": {
          if (!active.isRoot && active.parentId) {
            e.preventDefault();
            dispatch({
              modal: { kind: "edit-new", parentId: active.parentId },
              type: "OPEN_MODAL",
            });
          }
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
        case "ArrowUp":
        case "ArrowLeft": {
          e.preventDefault();
          if (active.isRoot) return;
          const parent = state.nodes[active.parentId!];
          if (!parent) return;
          const idx = parent.children.indexOf(state.selectedNodeId);
          if (idx > 0) {
            dispatch({ id: parent.children[idx - 1], type: "SELECT" });
          } else {
            dispatch({ id: parent.id, type: "SELECT" });
          }
          break;
        }
        case "ArrowDown":
        case "ArrowRight": {
          e.preventDefault();
          if (active.children.length > 0 && !active.collapsed) {
            dispatch({ id: active.children[0], type: "SELECT" });
          } else if (!active.isRoot && active.parentId) {
            const parent = state.nodes[active.parentId];
            const idx = parent?.children.indexOf(state.selectedNodeId) ?? -1;
            if (parent && idx >= 0 && idx < parent.children.length - 1) {
              dispatch({ id: parent.children[idx + 1], type: "SELECT" });
            }
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
