import { useEffect, useRef } from "react";
import { getMeta, loadFromDexie, saveToDexie, setMeta } from "../storage";
import { useMindStore } from "./use-mind-store";

const SAVE_DEBOUNCE_MS = 300;

export function useStorageSync(): void {
  const { dispatch, state } = useMindStore();
  const loadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadFromDexie();
        if (loaded) {
          dispatch({ nodes: loaded, type: "SET_NODES" });
        }
        const physics = await getMeta<boolean>("physicsEnabled");
        if (physics === false) {
          dispatch({ type: "TOGGLE_PHYSICS" });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("mintodo: failed to load from IndexedDB, using initial state", err);
      }
      loadedRef.current = true;
    })();
  }, [dispatch]);

  useEffect(() => {
    if (!loadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToDexie(state.nodes).catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error("mintodo: failed to save nodes", err);
      });
      setMeta("physicsEnabled", state.physicsEnabled).catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error("mintodo: failed to save meta", err);
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state.nodes, state.physicsEnabled]);
}
