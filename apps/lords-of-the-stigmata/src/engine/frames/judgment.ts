import type { Engine, Frame } from "../../types.ts";
import { ret } from "../runtime.ts";
import { country, logEvent, cdef, fxEvent, gainVp } from "../helpers.ts";
import { controllers } from "../scoring.ts";
import { advanceTrack } from "../tracks.ts";

/* ============================================================
   judgmentPhase (簡略化版): 各国の支配者に vp+2 と布教トラック+1
============================================================ */
export function stepJudgment(e: Engine, f: Frame): void {
  switch (f.pc) {
    case 0:
      e.S.phase = "judgment";
      fxEvent(e, { kind: "phase", phase: "judgment", round: e.S.round });
      e.S.cur = -1;
      for (const key of e.S.sel) {
        const c = country(e.S, key);
        const { first } = controllers(c);
        if (first.length === 1) {
          const pi = first[0];
          logEvent(e, "log.judgment", { player: pi, country: key });
          fxEvent(e, { kind: "judgment", pi, country: key });
          gainVp(e, pi, 2, "judgment", key);
          advanceTrack(e.S.players[pi].tracks, cdef(key).effect.track ?? "mission", 1);
        }
      }
      ret(e);
      return;
  }
}
