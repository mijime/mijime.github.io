import { useEffect } from "react";
import { decodeFloors, getShareParam } from "../floor/share";
import type { AppState } from "./use-history";

function initFromUrl(): Promise<AppState | null> {
  const param = getShareParam();
  if (!param) {
    return Promise.resolve(null);
  }
  return decodeFloors(param)
    .then((floors) => {
      if (floors.length === 0) {
        return null;
      }
      const building = { cellSize: 32, floors };
      return { activeFloorId: floors[0].id, building };
    })
    .catch(() => null);
}

export function useAppInit(push: (state: AppState) => void): void {
  useEffect(() => {
    initFromUrl().then((state) => {
      if (state) {
        push(state);
      }
    });
  }, []);
}
