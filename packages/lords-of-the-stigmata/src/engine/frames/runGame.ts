import type { Engine, Frame } from "../../types.ts";
import { ret } from "../runtime.ts";
import { logEvent, PC } from "../helpers.ts";

/* ============================================================
   runGame: pc 0=income(skip round 1),1=action,2=judgment,3=loop判定,4=final
============================================================ */
export function stepRunGame(e: Engine, f: Frame): void {
  switch (f.pc) {
    case 0:
      if (e.S.round > 6) {
        f.pc = 3;
        return;
      }
      if (e.S.round === 1) {
        f.pc = 1;
        return;
      }
      f.pc = 1;
      e.stack.push({ kind: "income", pc: 0, locals: {} });
      return;
    case 1:
      f.pc = 2;
      e.stack.push({ kind: "action", pc: 0, locals: {} });
      return;
    case 2:
      f.pc = 3;
      e.stack.push({ kind: "judgment", pc: 0, locals: {} });
      return;
    case 3:
      if (e.S.round >= 6) {
        f.pc = 4;
        return;
      }
      e.S.round++;
      for (let i = 0; i < PC(e.S); i++) {
        e.S.players[i].passed = false;
        e.S.players[i].feeWaiverCount = 0;
      }
      if (e.S.firstPasser !== null) {
        const order = [];
        for (let i = 0; i < PC(e.S); i++) {
          order.push((e.S.firstPasser + i) % PC(e.S));
        }
        e.S.order = order;
        e.S.firstPasser = null;
      }
      logEvent(e, "log.roundStart", { round: e.S.round }, "sys");
      f.pc = 0;
      return;
    case 4:
      f.pc = 5;
      e.stack.push({ kind: "final", pc: 0, locals: {} });
      return;
    case 5:
      ret(e);
      return;
  }
}
