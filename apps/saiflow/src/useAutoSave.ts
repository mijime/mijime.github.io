import { useCallback, useEffect, useRef } from "react";
import { saveScenario } from "./storage";
import { useSaiflowDispatch, useSaiflowState } from "./store";

const SAVE_DEBOUNCE_MS = 500;

/**
 * Persists the current document whenever it changes.
 *
 * Writes are serialized so an older save cannot overwrite a newer one, and
 * failures are surfaced in the UI instead of being silently swallowed.
 */
export function useAutoSave() {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();

  const stateRef = useRef(state);
  stateRef.current = state;

  const idRef = useRef<number | null>(state.scenarioId);
  idRef.current = state.scenarioId;

  const documentVersionRef = useRef(state.documentVersion);
  documentVersionRef.current = state.documentVersion;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(false);
  const editVersionRef = useRef(0);

  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!stateRef.current.started) return;

    dispatch({ type: "SET_SAVE_STATUS", status: "saving" });
    const version = editVersionRef.current;
    const documentVersion = documentVersionRef.current;

    const job = async () => {
      const snapshot = stateRef.current;
      if (!snapshot.started) return;
      try {
        const id = await saveScenario({
          id: idRef.current ?? undefined,
          name: snapshot.scenarioName,
          dslText: snapshot.dslText,
          currentAge: snapshot.currentAge,
          simulationYears: snapshot.simulationYears,
        });
        // A different document was opened while this write was in flight.
        if (documentVersionRef.current !== documentVersion) return;
        idRef.current = id;
        dispatch({ type: "SET_SCENARIO_ID", id });
        if (editVersionRef.current === version) {
          dispatch({ type: "SET_SAVE_STATUS", status: "saved", at: new Date(), error: null });
        } else {
          // Edits arrived while the write was in flight.
          dispatch({ type: "SET_SAVE_STATUS", status: "dirty" });
        }
      } catch (error) {
        dispatch({
          type: "SET_SAVE_STATUS",
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    chainRef.current = chainRef.current.catch(() => undefined).then(job);
  }, [dispatch]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!state.started) return;

    editVersionRef.current += 1;
    dispatch({ type: "SET_SAVE_STATUS", status: "dirty" });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveNow, SAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    state.dslText,
    state.currentAge,
    state.simulationYears,
    state.scenarioName,
    state.started,
    dispatch,
    saveNow,
  ]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveNow();
    };
    const onPageHide = () => saveNow();
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const status = stateRef.current.saveStatus;
      if (status === "dirty" || status === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [saveNow]);

  return { saveNow, retry: saveNow };
}
