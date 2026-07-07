import type { Engine, Frame, Action } from "../../types.ts";
import { ret } from "../runtime.ts";
import {
  PC,
  country,
  logEvent,
  placePawn,
  setWait,
  cdef,
  applyGain,
  fxEvent,
  gainVp,
} from "../helpers.ts";
import { hasSeat, isAdjacentToOwn, cohabitants } from "../map.ts";
import { scoreEvent } from "../round-tiles.ts";
import { advanceTrack, retreatTrack } from "../tracks.ts";
import { cap as capHelper } from "../helpers.ts";
import { DOCTRINES } from "../../data/doctrines.ts";
import { RELICS } from "../../data/relics.ts";

/* ============================================================
   checkRelic: 有効アクション解決後に当ラウンドの聖遺物獲得条件をチェック
============================================================ */
/** 有効アクション解決後、当ラウンドの公開聖遺物の条件を満たしていれば獲得 */
function checkRelic(e: Engine, pi: number): void {
  const key = e.S.relicPool[e.S.round - 1];
  if (!key || key in e.S.relicsTaken) return;
  const def = RELICS[key];
  if (def && def.cond(e.S, pi)) {
    e.S.relicsTaken[key] = pi;
    e.S.players[pi].relics.push(key);
    logEvent(e, "log.relicTaken", { player: pi, relic: key });
    fxEvent(e, { kind: "relic", pi, relic: key });
  }
}

/* ============================================================
   actionPhase: order ベースで巡回、passed フラグで追跡
============================================================ */
export function stepAction(e: Engine, f: Frame): void {
  switch (f.pc) {
    case 0:
      e.S.phase = "action";
      fxEvent(e, { kind: "phase", phase: "action", round: e.S.round });
      f.locals.actIdx = 0;
      f.pc = 1;
      return;
    case 1: {
      const actIdx = f.locals.actIdx as number;
      const allPassed = e.S.players.every((p) => p.passed);
      if (allPassed) {
        f.pc = 9;
        return;
      }
      const pi = e.S.order[actIdx % PC(e.S)];
      if (e.S.players[pi].passed) {
        f.locals.actIdx = actIdx + 1;
        return;
      }
      e.S.cur = pi;
      f.locals.curPi = pi;
      f.pc = 2;
      e.stack.push({ kind: "chooseAction", pc: 0, locals: { pi } });
      return;
    }
    case 2: {
      const pi = f.locals.curPi as number;
      const act = f.ret as Action;
      if (act.type === "pass") {
        e.S.players[pi].passed = true;
        if (e.S.firstPasser === null) {
          e.S.firstPasser = pi;
        }
        logEvent(e, "log.pass", { player: pi });
        fxEvent(e, { kind: "pass", pi });
        f.pc = 3;
        return;
      }
      f.pc = 3;
      e.stack.push({
        kind: "execAction",
        pc: 0,
        locals: { pi, act },
      });
      return;
    }
    case 3: {
      if (f.ret === false) {
        // 無効アクション: 手番を消費せず同一プレイヤーに再入力
        f.pc = 1;
        return;
      }
      const curPi = f.locals.curPi as number;
      if (e.S.players[curPi].isAI && !e.S.players[curPi].passed) {
        setWait(e, 1);
      }
      f.locals.actIdx = (f.locals.actIdx as number) + 1;
      f.pc = 1;
      return;
    }
    case 9: {
      e.S.cur = -1;
      ret(e);
      return;
    }
  }
}

/* ============================================================
   executeAction: dispatch/promote/acquire/deepen
============================================================ */
export function stepExecAction(e: Engine, f: Frame): void {
  const pi = f.locals.pi as number;
  const act = f.locals.act as Action;
  const p = e.S.players[pi];
  switch (f.pc) {
    case 0:
      if (act.type === "dispatch") {
        const c = country(e.S, act.country);
        const cap = capHelper(e.S, act.country);
        const adjacent = isAdjacentToOwn(e.S.board, e.S.adj, pi, act.country);
        if (!hasSeat(c, cap)) {
          ret(e, false);
          return;
        }
        const feeWaived = adjacent || p.faction === "senkyoshi";
        const needAc = (act.pawn === "ac" ? 1 : 0) + (feeWaived ? 0 : 1);
        const needAp = act.pawn === "ap" ? 1 : 0;
        if (p.act.ac < needAc || p.act.ap < needAp) {
          ret(e, false);
          return;
        }
        placePawn(e, pi, act.pawn, act.country);
        if (!feeWaived) p.act.ac--;
        const tile = e.S.roundTiles[e.S.round - 1];
        gainVp(e, pi, scoreEvent(tile, act.pawn === "ap" ? "dispatchAp" : "dispatchAc"), "tile");
        if (cohabitants(c, pi).length > 0) gainVp(e, pi, scoreEvent(tile, "cohabit"), "tile");
        const eff = cdef(act.country).effect;
        applyGain(e, pi, eff, "country", act.country);
        if (eff.apExtra && act.pawn === "ap") applyGain(e, pi, eff, "country", act.country);
        for (const copiId of cohabitants(c, pi)) {
          advanceTrack(e.S.players[copiId].tracks, eff.track ?? "mission", 1);
        }
        logEvent(e, "log.dispatch", { player: pi, pawn: act.pawn, country: act.country });
        checkRelic(e, pi);
        ret(e);
        return;
      } else if (act.type === "promote") {
        if (p.act.ac < 2) {
          ret(e, false);
          return;
        }
        p.act.ac -= 2;
        p.act.ap += 1;
        advanceTrack(p.tracks, "sacrifice", 1);
        p.promoteCount += 1;
        const tile = e.S.roundTiles[e.S.round - 1];
        const vp = scoreEvent(tile, "promote");
        gainVp(e, pi, vp, "tile");
        if (p.faction === "junkyosha" && p.promoteCount % 2 === 0) gainVp(e, pi, 1, "faction");
        logEvent(e, "log.promote", { player: pi });
        fxEvent(e, { kind: "promote", pi });
        checkRelic(e, pi);
        ret(e);
        return;
      } else if (act.type === "acquire") {
        if (p.act.ac < 2 || p.doctrines.length >= 3 || p.doctrines.some((d) => d.key === act.doc)) {
          ret(e, false);
          return;
        }
        const def = DOCTRINES[act.doc];
        if (!def) {
          ret(e, false);
          return;
        }
        // コスト: 信徒2 + 任意トラック1後退(叡智優先、0なら他)
        if (p.faction !== "shisai") {
          if (p.tracks.wisdom > 0) {
            retreatTrack(p.tracks, "wisdom", 1);
          } else {
            const tracks = ["sacrament", "sacrifice", "mission"] as const;
            for (const tk of tracks) {
              if (p.tracks[tk] > 0) {
                retreatTrack(p.tracks, tk, 1);
                break;
              }
            }
          }
        }
        p.act.ac -= 2;
        p.doctrines.push({ key: act.doc, lv: 1 });
        advanceTrack(p.tracks, def.track, 1);
        applyGain(e, pi, def.lv1, "doctrine");
        gainVp(e, pi, scoreEvent(e.S.roundTiles[e.S.round - 1], "acquire"), "tile");
        logEvent(e, "log.acquire", { player: pi, doctrine: act.doc, cost: 2 });
        fxEvent(e, { kind: "acquire", pi, doc: act.doc });
        checkRelic(e, pi);
        ret(e);
        return;
      } else if (act.type === "deepen") {
        const doc = p.doctrines.find((d) => d.key === act.doc);
        if (!doc || doc.lv !== 1) {
          ret(e, false);
          return;
        }
        const light = p.faction === "shinpika";
        if (light ? p.act.ac < 2 : p.act.ac < 1 || p.act.ap < 1) {
          ret(e, false);
          return;
        }
        if (light) {
          p.act.ac -= 2;
        } else {
          p.act.ac -= 1;
          p.act.ap -= 1;
        }
        doc.lv = 2;
        applyGain(e, pi, DOCTRINES[act.doc].lv2, "doctrine");
        gainVp(e, pi, scoreEvent(e.S.roundTiles[e.S.round - 1], "deepen"), "tile");
        logEvent(e, "log.deepen", { player: pi, doctrine: act.doc });
        fxEvent(e, { kind: "deepen", pi, doc: act.doc });
        checkRelic(e, pi);
        ret(e);
        return;
      } else if (act.type === "upgrade") {
        const c = country(e.S, act.country);
        const acPawn = c.pawns.find((pw) => pw.owner === pi && pw.type === "ac");
        if (p.act.ac < 1 || !acPawn) {
          ret(e, false);
          return;
        }
        p.act.ac -= 1;
        acPawn.type = "ap";
        logEvent(e, "log.upgrade", { player: pi, country: act.country });
        fxEvent(e, { kind: "upgrade", pi, country: act.country });
        checkRelic(e, pi);
        ret(e);
        return;
      }
      ret(e);
      return;
  }
}
