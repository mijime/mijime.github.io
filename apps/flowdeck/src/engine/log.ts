import type { GameState, LogEntry } from "./types";

export function pushLog(state: GameState, message: string, kind: LogEntry["kind"] = "info"): void {
  state.log.push({ day: state.day, message, kind });
  if (state.log.length > 500) state.log.splice(0, state.log.length - 500);
}
