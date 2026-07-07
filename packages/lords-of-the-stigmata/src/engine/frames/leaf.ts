import type { Engine, Frame, CountryKey, ModalOption } from "../../types.ts";
import { ret } from "../runtime.ts";
import { aiFreeTarget } from "../ai.ts";

/* ============================================================
   リーフ手続き：人間入力を pending で要求する基本手続き
   規約: pending を出したら停止。dispatch が f.locals.answer に値を入れ、
         pending=null にして再 step → 該当 pc が answer を読む。
============================================================ */

/* ---- askYesNo: locals {pi, question, desc, aiYes} → ret(boolean) ---- */
export function stepAskYesNo(e: Engine, f: Frame): void {
  const pi = f.locals.pi as number;
  const p = e.S.players[pi];
  if (f.pc === 0) {
    if (p.isAI) {
      ret(e, f.locals.aiYes as boolean);
      return;
    }
    // 人間: はい/いいえモーダル
    e.pending = {
      kind: "modal",
      pi,
      titleKey: "modal.choiceTitle",
      titleParams: { name: p.name },
      subKey: f.locals.questionKey as string,
      subParams: f.locals.questionParams as Record<string, string | number> | undefined,
      opts: [{ labelKey: "modal.yes", descKey: f.locals.descKey as string }],
      cancelKey: "modal.no",
    };
    f.pc = 1;
    return;
  }
  // pc === 1: 応答受領
  const ans = f.locals.answer as number | null;
  ret(e, ans === 0);
}

/* ---- pickCountry: locals {pi, valid, label, allowSkip, aiPick:"free"|null, freeType?} → ret(CountryKey|null) ---- */
export function stepPickCountry(e: Engine, f: Frame): void {
  const pi = f.locals.pi as number;
  const p = e.S.players[pi];
  const valid = f.locals.valid as CountryKey[];
  if (f.pc === 0) {
    if (!valid.length) {
      ret(e, null);
      return;
    }
    if (p.isAI) {
      if (f.locals.aiPick === "free") {
        ret(e, aiFreeTarget(e, pi, valid));
      } else {
        ret(e, valid[0]);
      }
      return;
    }
    e.pending = {
      kind: "pickCountry",
      pi,
      valid,
      labelKey: f.locals.labelKey as string,
      labelParams: f.locals.labelParams as Record<string, string | number> | undefined,
      allowSkip: f.locals.allowSkip as boolean,
      skipKey: f.locals.skipKey as string | undefined,
    };
    f.pc = 1;
    return;
  }
  ret(e, f.locals.answer as CountryKey | null);
}

/* ---- showModal: locals {pi, titleKey, titleParams?, subKey?, subParams?, opts, cancelKey?} → ret(number|null) ---- */
export function stepShowModal(e: Engine, f: Frame): void {
  if (f.pc === 0) {
    e.pending = {
      kind: "modal",
      pi: f.locals.pi as number,
      titleKey: f.locals.titleKey as string,
      titleParams: f.locals.titleParams as Record<string, string | number> | undefined,
      subKey: f.locals.subKey as string | undefined,
      subParams: f.locals.subParams as Record<string, string | number> | undefined,
      opts: f.locals.opts as ModalOption[],
      cancelKey: f.locals.cancelKey as string | undefined,
    };
    f.pc = 1;
    return;
  }
  ret(e, f.locals.answer as number | null);
}

/* ---- chooseAction: locals {pi} → ret(Action) ---- */
export function stepChooseAction(e: Engine, f: Frame): void {
  const pi = f.locals.pi as number;
  const p = e.S.players[pi];
  if (f.pc === 0) {
    e.bannerKey = p.isAI ? "" : "banner.yourTurn";
    e.pending = { kind: "action", pi };
    f.pc = 1;
    return;
  }
  e.bannerKey = "";
  ret(e, f.locals.answer);
}
