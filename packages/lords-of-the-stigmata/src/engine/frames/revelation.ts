import type { Engine, Frame, CountryKey } from "../../types.ts";
import { ret } from "../runtime.ts";
import { PC, logEvent, country, fxEvent } from "../helpers.ts";
import { calcIncome, applyIncome } from "../income.ts";
import { decideRecall } from "../ai.ts";

/* ============================================================
   incomePhase: recall loop then income calculation
============================================================ */
export function stepIncome(e: Engine, f: Frame): void {
  switch (f.pc) {
    case 0:
      e.S.phase = "income";
      fxEvent(e, { kind: "phase", phase: "income", round: e.S.round });
      f.locals.idx = 0;
      f.pc = 1;
      return;
    case 1: {
      const idx = f.locals.idx as number;
      if (idx >= PC(e.S)) {
        f.pc = 9;
        return;
      }
      const pi = e.S.order[idx];
      const p = e.S.players[pi];
      const valid: CountryKey[] = [];
      for (const key of e.S.sel) {
        const bc = country(e.S, key);
        if (bc.pawns.some((pw) => pw.owner === pi)) {
          valid.push(key);
        }
      }
      if (valid.length === 0) {
        f.locals.idx = idx + 1;
        return;
      }
      if (p.isAI) {
        const recallKey = decideRecall(e, pi);
        if (recallKey) {
          doRecall(e, pi, recallKey);
        }
        f.locals.idx = idx + 1;
        return;
      }
      e.stack.push({
        kind: "pickCountry",
        pc: 0,
        locals: {
          pi,
          valid,
          labelKey: "pick.recall",
          allowSkip: true,
          skipKey: "pick.skipRecall",
        },
      });
      f.pc = 2;
      return;
    }
    case 2: {
      const recallKey = f.ret as CountryKey | null;
      const idx = f.locals.idx as number;
      const pi = e.S.order[idx];
      if (recallKey) {
        doRecall(e, pi, recallKey);
      }
      f.locals.idx = idx + 1;
      f.pc = 1;
      return;
    }
    case 9: {
      e.S.cur = -1;
      for (let i = 0; i < PC(e.S); i++) {
        const p = e.S.players[i];
        const inc = calcIncome(e.S.board, i, p);
        applyIncome(p, inc);
        logEvent(e, "log.income", { player: i, ac: inc.ac, ap: inc.ap });
        fxEvent(e, { kind: "income", pi: i, ac: inc.ac, ap: inc.ap });
      }
      ret(e);
      return;
    }
  }
}

function doRecall(e: Engine, pi: number, key: CountryKey): void {
  const bc = country(e.S, key);
  const p = e.S.players[pi];
  const acPawn = bc.pawns.find((pw) => pw.owner === pi && pw.type === "ac");
  if (acPawn) {
    bc.pawns = bc.pawns.filter((pw) => pw !== acPawn);
    p.act.ac += 1;
    logEvent(e, "log.recall", { player: pi, pawn: "ac", country: key });
    fxEvent(e, { kind: "recall", pi, pawn: "ac", country: key });
  } else {
    const apPawn = bc.pawns.find((pw) => pw.owner === pi && pw.type === "ap");
    if (apPawn) {
      bc.pawns = bc.pawns.filter((pw) => pw !== apPawn);
      p.act.ap += 1;
      logEvent(e, "log.recall", { player: pi, pawn: "ap", country: key });
      fxEvent(e, { kind: "recall", pi, pawn: "ap", country: key });
    }
  }
}
